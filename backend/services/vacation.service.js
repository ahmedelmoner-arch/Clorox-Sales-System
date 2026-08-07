const { toDate, toNumber, updateSheetRow } = require("./sheets.service");

const MONTH_HEADERS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه");
}

const { matchesDelegateRow } = require("./target.service");
function matchesDelegate(row, delegateId) {
  return matchesDelegateRow(row, delegateId);
}

function isAnnualVacation(vacationType) {
  const normalized = normalizeText(vacationType);
  return normalized.includes("سنوي") || normalized.includes("annual");
}

function annualVacationReportId(report) {
  return report.UUID || [
    report.DelegateID,
    toDate(report.Date),
    report.VacationType,
    report.CreatedAt,
  ].join("-");
}

function countAnnualVacationReports(reports, delegateId) {
  return getAnnualVacationDays(reports, delegateId).length;
}

function getAnnualVacationDays(reports, delegateId) {
  const reportIds = new Set();
  return reports
    .filter((report) => {
      if (!matchesDelegate(report, delegateId)) return false;
      if (String(report.ReportType || "").trim() !== "Vacation") return false;
      if (!isAnnualVacation(report.VacationType)) return false;
      const id = annualVacationReportId(report);
      if (reportIds.has(id)) return false;
      reportIds.add(id);
      return Boolean(toDate(report.Date));
    })
    .map((report) => ({
      id: annualVacationReportId(report),
      date: toDate(report.Date),
      vacationType: String(report.VacationType || "").trim(),
    }))
    .sort((left, right) => right.date.localeCompare(left.date));
}

function findHeader(headers, aliases) {
  const normalizedAliases = aliases.map(normalizeText);
  return headers.find((header) => normalizedAliases.includes(normalizeText(header)));
}

function getVacationSummary(rows, delegateId, reports = []) {
  const record = rows.find((row) => matchesDelegate(row, delegateId));
  if (!record) return { total: 0, consumed: 0, remaining: 0 };

  const total = toNumber(record.TotalVacation || record["Total Vacation"]);
  const sheetConsumed = toNumber(record.TotalConsumed);
  const reportedConsumed = countAnnualVacationReports(reports, delegateId);
  const consumed = Math.max(sheetConsumed, reportedConsumed);
  // Keep the card consistent even when TotalRemaining was not refreshed.
  const remaining = Math.max(total - consumed, 0);

  return { total, consumed, remaining };
}

function getMonthHeader(headers, date) {
  const parsedDate = new Date(`${toDate(date)}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return findHeader(headers, [MONTH_HEADERS[parsedDate.getMonth()]]);
}

async function syncVacationDelegateBalance(vacationSheet, delegateId, reports, { date, incrementMonth = false, reconcile = false } = {}) {
  const recordIndex = vacationSheet.rows.findIndex((row) => matchesDelegate(row, delegateId));
  if (recordIndex === -1) {
    throw new Error("No annual-leave balance was found for this delegate in VacationDelegate");
  }

  const record = vacationSheet.rows[recordIndex];
  const totalHeader = findHeader(vacationSheet.headers, ["TotalVacation", "Total Vacation"]);
  const consumedHeader = findHeader(vacationSheet.headers, ["TotalConsumed"]);
  const remainingHeader = findHeader(vacationSheet.headers, ["TotalRemaining"]);
  if (!consumedHeader) throw new Error("VacationDelegate is missing the TotalConsumed column");

  const existingConsumed = toNumber(record[consumedHeader]);
  const reportedConsumed = countAnnualVacationReports(reports, delegateId);
  const consumed = reconcile ? reportedConsumed : Math.max(existingConsumed, reportedConsumed);
  const updatedRecord = { ...record, [consumedHeader]: consumed };

  if (remainingHeader) {
    const total = toNumber(record[totalHeader] ?? record.TotalVacation ?? record["Total Vacation"]);
    updatedRecord[remainingHeader] = Math.max(total - consumed, 0);
  }

  if (reconcile) {
    const annualDays = getAnnualVacationDays(reports, delegateId);
    MONTH_HEADERS.forEach((monthName, monthIndex) => {
      const monthHeader = findHeader(vacationSheet.headers, [monthName]);
      if (!monthHeader) return;
      updatedRecord[monthHeader] = annualDays.filter((day) => {
        const parsedDate = new Date(`${day.date}T12:00:00`);
        return !Number.isNaN(parsedDate.getTime()) && parsedDate.getMonth() === monthIndex;
      }).length;
    });
  } else {
    const monthHeader = incrementMonth ? getMonthHeader(vacationSheet.headers, date) : null;
    if (monthHeader) {
    const month = toDate(date).slice(0, 7);
    const reportedForMonth = getAnnualVacationDays(reports, delegateId)
      .filter((day) => day.date.slice(0, 7) === month)
      .length;
    updatedRecord[monthHeader] = Math.max(toNumber(record[monthHeader]), reportedForMonth);
    }
  }

  const rowNumber = vacationSheet.rowNumbers?.[recordIndex] || recordIndex + 2;
  return updateSheetRow("VacationDelegate", vacationSheet.headers, rowNumber, updatedRecord);
}

module.exports = {
  countAnnualVacationReports,
  getAnnualVacationDays,
  getVacationSummary,
  isAnnualVacation,
  syncVacationDelegateBalance,
};
