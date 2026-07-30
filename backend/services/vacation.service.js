const { toDate, toNumber, updateSheetRow } = require("./sheets.service");

const MONTH_HEADERS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه");
}

function matchesDelegate(row, delegateId) {
  return String(row.DelegateID || "").trim() === String(delegateId || "").trim();
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
  const reportIds = new Set();
  reports.forEach((report) => {
    if (!matchesDelegate(report, delegateId)) return;
    if (String(report.ReportType || "").trim() !== "Vacation") return;
    if (!isAnnualVacation(report.VacationType)) return;
    reportIds.add(annualVacationReportId(report));
  });
  return reportIds.size;
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
  const remainingValue = String(record.TotalRemaining ?? "").trim();
  const remaining = reportedConsumed > sheetConsumed || !remainingValue
    ? Math.max(total - consumed, 0)
    : toNumber(remainingValue);

  return { total, consumed, remaining };
}

function getMonthHeader(headers, date) {
  const parsedDate = new Date(`${toDate(date)}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return findHeader(headers, [MONTH_HEADERS[parsedDate.getMonth()]]);
}

async function syncVacationDelegateBalance(vacationSheet, delegateId, reports, { date, incrementMonth = false } = {}) {
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
  const consumed = Math.max(existingConsumed, countAnnualVacationReports(reports, delegateId));
  const updatedRecord = { ...record, [consumedHeader]: consumed };

  if (remainingHeader) {
    const total = toNumber(record[totalHeader] ?? record.TotalVacation ?? record["Total Vacation"]);
    updatedRecord[remainingHeader] = Math.max(total - consumed, 0);
  }

  const monthHeader = incrementMonth ? getMonthHeader(vacationSheet.headers, date) : null;
  if (monthHeader) {
    updatedRecord[monthHeader] = toNumber(record[monthHeader]) + 1;
  }

  const rowNumber = vacationSheet.rowNumbers?.[recordIndex] || recordIndex + 2;
  return updateSheetRow("VacationDelegate", vacationSheet.headers, rowNumber, updatedRecord);
}

module.exports = {
  countAnnualVacationReports,
  getVacationSummary,
  isAnnualVacation,
  syncVacationDelegateBalance,
};
