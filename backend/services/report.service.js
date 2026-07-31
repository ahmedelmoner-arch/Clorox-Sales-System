const { randomUUID } = require("crypto");
const {
  appendSheetRows,
  currentMonth,
  getSheetRows,
  toDate,
  toMonth,
  toNumber,
} = require("./sheets.service");
const { canonicalReportType } = require("../utils/report-types");
const { isAnnualVacation, syncVacationDelegateBalance } = require("./vacation.service");
const { createProductOrder } = require("../utils/product-order");

const REPORT_SHEET = "Reports";
const REPORT_TYPES = new Set(["Sales", "Vouchers", "Vacation"]);

function reportMonth(report) {
  const month = toMonth(report.Month);
  return /^\d{4}-\d{2}$/.test(month) ? month : toMonth(report.Date);
}

function targetMonth(target) {
  const month = toMonth(target.Month);
  return /^\d{4}-\d{2}$/.test(month) ? month : toMonth(target.Date);
}

function matchesDelegate(report, delegateId) {
  return String(report.DelegateID || "").trim() === String(delegateId || "").trim();
}

function normalizeTargetValue(value) {
  return String(value ?? "").trim();
}

function matchesTargetBranch(target, branch) {
  const branchName = normalizeTargetValue(branch?.BranchName || branch?.name);
  const targetBranchName = normalizeTargetValue(target.BranchName);
  if (branchName && targetBranchName) return branchName === targetBranchName;

  const branchId = normalizeTargetValue(branch?.BranchID || branch?.BranchId || branch?.code);
  const targetBranchId = normalizeTargetValue(target.BranchID);
  if (branchId && targetBranchId) return branchId === targetBranchId;

  return !branchName && !branchId;
}

function targetBranchKey(target) {
  return normalizeTargetValue(target.BranchName) || normalizeTargetValue(target.BranchID) || "all-branches";
}

function orderByDate(reports) {
  return [...reports].sort((left, right) => {
    const leftDate = new Date(toDate(left.Date) || left.CreatedAt || 0).getTime();
    const rightDate = new Date(toDate(right.Date) || right.CreatedAt || 0).getTime();
    return rightDate - leftDate;
  });
}

function makeSummary(reports) {
  const reportIds = new Set();
  const totals = reports.reduce(
    (summary, report) => {
      const type = report.ReportType || "Sales";
      const reportId = report.UUID || `${report.Date}-${report.DelegateID}-${report.BranchID}-${type}`;
      if (!reportIds.has(reportId)) {
        reportIds.add(reportId);
        summary.count += 1;
        summary.byType[type] = (summary.byType[type] || 0) + 1;
        summary.targetConsumers += toNumber(report.TargetConsumer);
      }
      summary.actualPieces += toNumber(report.ActualPieces);
      summary.targetPieces += toNumber(report.TargetPieces);
      summary.positiveConsumers += toNumber(report.PostiveConsumer);
      summary.negativeConsumers += toNumber(report.NegativeConsumer);
      summary.totalConsumers += toNumber(report.TotalConsumer);
      summary.vouchers += type === "Vouchers" ? toNumber(report.Amount) : 0;
      return summary;
    },
    {
      count: 0,
      actualPieces: 0,
      targetPieces: 0,
      positiveConsumers: 0,
      negativeConsumers: 0,
      totalConsumers: 0,
      targetConsumers: 0,
      vouchers: 0,
      byType: {},
    }
  );

  return {
    ...totals,
    piecesAchievement: totals.targetPieces ? Math.round((totals.actualPieces / totals.targetPieces) * 100) : 0,
    consumersAchievement: totals.targetConsumers
      ? Math.round((totals.totalConsumers / totals.targetConsumers) * 100)
      : 0,
  };
}

function buildMonthlyAggregate(reports, targets, products, delegateId, month) {
  const catalog = new Map(products.map((product) => [String(product.ProductID || "").trim(), product]));
  const productOrder = createProductOrder(products);
  const productTotals = new Map();
  const customerTargetsByDayBranch = new Map();

  function ensureProduct(productId, fallback = {}) {
    if (!productTotals.has(productId)) {
      const product = catalog.get(productId) || {};
      productTotals.set(productId, {
        productId,
        productName: product.ProductName || fallback.ProductName || productId,
        category: product.Category || fallback.Category || fallback.CategoryName || "منتجات أخرى",
        actualPieces: 0,
        targetPieces: 0,
      });
    }
    return productTotals.get(productId);
  }

  targets.forEach((target) => {
    if (!matchesDelegate(target, delegateId) || targetMonth(target) !== month) return;

    const date = toDate(target.Date) || month;
    const branch = targetBranchKey(target);
    const customerKey = `${date}-${branch}`;
    customerTargetsByDayBranch.set(
      customerKey,
      Math.max(customerTargetsByDayBranch.get(customerKey) || 0, toNumber(target.TargetConsumer))
    );

    const productId = String(target.ProductID || "").trim();
    if (!productId) return;
    ensureProduct(productId, target).targetPieces += toNumber(target.TargetPieces);
  });

  reports.forEach((report) => {
    const productId = String(report.ProductID || "").trim();
    if (!productId) return;
    ensureProduct(productId, report).actualPieces += toNumber(report.ActualPieces);
  });

  const productsData = [...productTotals.values()]
    .filter((product) => product.actualPieces || product.targetPieces)
    .map((product) => ({
      ...product,
      piecesAchievement: product.targetPieces
        ? Math.round((product.actualPieces / product.targetPieces) * 100)
        : 0,
    }))
    .sort(productOrder.compareProducts);

  const categoryTotals = new Map();
  productsData.forEach((product) => {
    const current = categoryTotals.get(product.category) || {
      category: product.category,
      actualPieces: 0,
      targetPieces: 0,
      products: [],
    };
    current.actualPieces += product.actualPieces;
    current.targetPieces += product.targetPieces;
    current.products.push(product);
    categoryTotals.set(product.category, current);
  });

  const categories = [...categoryTotals.values()]
    .map((category) => ({
      ...category,
      piecesAchievement: category.targetPieces
        ? Math.round((category.actualPieces / category.targetPieces) * 100)
        : 0,
    }))
    .sort(productOrder.compareCategories);

  const reportSummary = makeSummary(reports);
  const targetPieces = productsData.reduce((total, product) => total + product.targetPieces, 0);
  const targetConsumers = [...customerTargetsByDayBranch.values()].reduce((total, target) => total + target, 0);

  return {
    actualPieces: reportSummary.actualPieces,
    targetPieces,
    piecesAchievement: targetPieces ? Math.round((reportSummary.actualPieces / targetPieces) * 100) : 0,
    totalConsumers: reportSummary.totalConsumers,
    targetConsumers,
    consumersAchievement: targetConsumers ? Math.round((reportSummary.totalConsumers / targetConsumers) * 100) : 0,
    vouchers: reportSummary.vouchers,
    reports: reportSummary.count,
    categories,
  };
}

async function getReportsForDelegate(user, { month, type, all = false } = {}) {
  const [reportSheet, targetSheet, productSheet] = await Promise.all([
    getSheetRows(REPORT_SHEET),
    getSheetRows("Targets"),
    getSheetRows("Products"),
  ]);
  const { rows } = reportSheet;
  const selectedMonth = all ? null : (month || currentMonth());
  const selectedType = type ? canonicalReportType(type) : null;
  const delegateId = user.delegateId || user.id;

  const reportsForMonth = rows.filter((report) => matchesDelegate(report, delegateId) && (all || reportMonth(report) === selectedMonth));
  const withResolvedTargetConsumers = (matchingReports) => matchingReports.map((report) => ({
    ...report,
    TargetConsumer: getTargetsForDate(targetSheet.rows, user, toDate(report.Date), report).targetConsumers || toNumber(report.TargetConsumer),
  }));
  const reports = orderByDate(withResolvedTargetConsumers(reportsForMonth.filter((report) => !type || report.ReportType === selectedType)));
  const monthlyAggregate = buildMonthlyAggregate(
    withResolvedTargetConsumers(reportsForMonth),
    targetSheet.rows,
    productSheet.rows,
    delegateId,
    selectedMonth
  );

  return { reports, summary: makeSummary(reports), monthlyAggregate, month: selectedMonth || "all" };
}

async function getTargetSummary(user, month = currentMonth()) {
  const { rows } = await getSheetRows("Targets");
  const delegateId = user.delegateId || user.id;
  const customerTargetsByDay = new Map();
  let targetPieces = 0;

  rows.forEach((target) => {
    if (!matchesDelegate(target, delegateId) || toMonth(target.Month || target.Date) !== month) return;
    targetPieces += toNumber(target.TargetPieces);
    const dayKey = `${toDate(target.Date) || String(target.Month || month)}-${targetBranchKey(target)}`;
    customerTargetsByDay.set(dayKey, Math.max(customerTargetsByDay.get(dayKey) || 0, toNumber(target.TargetConsumer)));
  });

  return {
    targetPieces,
    targetConsumers: [...customerTargetsByDay.values()].reduce((total, value) => total + value, 0),
  };
}

async function getTargetSummaryForDate(user, date) {
  const { rows } = await getSheetRows("Targets");
  const { productTargets, targetConsumers } = getTargetsForDate(rows, user, date);
  return {
    targetPieces: [...productTargets.values()].reduce((total, value) => total + value, 0),
    targetConsumers,
  };
}

function requireNonNegativeInteger(value, fieldName) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
    throw new Error(`${fieldName} must be a non-negative whole number`);
  }
  return amount;
}

function requireEnteredNonNegativeInteger(value, fieldName) {
  if (String(value ?? "").trim() === "") throw new Error(`${fieldName} is required`);
  const amount = requireNonNegativeInteger(value, fieldName);
  return amount;
}

function safeText(value, maximumLength = 500) {
  return String(value ?? "").trim().slice(0, maximumLength);
}

function getTargetsForDate(targets, user, date, branch) {
  const delegateId = user.delegateId || user.id;
  const targetMonth = toMonth(date);
  const productTargets = new Map();
  const customerTargetsByBranch = new Map();

  targets.forEach((target) => {
    if (!matchesDelegate(target, delegateId)) return;
    const targetDate = toDate(target.Date);
    if (targetDate ? targetDate !== date : toMonth(target.Month) !== targetMonth) return;
    if (!matchesTargetBranch(target, branch)) return;

    const branchKey = targetBranchKey(target);
    customerTargetsByBranch.set(
      branchKey,
      Math.max(customerTargetsByBranch.get(branchKey) || 0, toNumber(target.TargetConsumer))
    );

    const productId = String(target.ProductID || "").trim();
    if (!productId) return;
    productTargets.set(productId, (productTargets.get(productId) || 0) + toNumber(target.TargetPieces));
  });

  return {
    productTargets,
    targetConsumers: [...customerTargetsByBranch.values()].reduce((total, value) => total + value, 0),
  };
}

function buildRecord({ user, payload, reportType, date, branch, supervisor, product, isFirst, reportId, targetConsumers }) {
  const hasConsumerFields = reportType !== "Vacation" && isFirst;
  const positiveConsumers = hasConsumerFields
    ? requireEnteredNonNegativeInteger(payload.positiveConsumers, "Positive consumers")
    : "";
  const negativeConsumers = hasConsumerFields
    ? requireEnteredNonNegativeInteger(payload.negativeConsumers, "Negative consumers")
    : "";

  return {
    UUID: reportId,
    Month: toMonth(date),
    Date: date,
    SupervisorsID: supervisor?.SupervisorsID || user.supervisorCode || "",
    SupervisorName: supervisor?.SupervisorName || "",
    DelegateID: user.delegateId || user.id || "",
    DelegateName: user.name || user.delegateName || "",
    BranchID: branch?.BranchID || "",
    BranchName: branch?.BranchName || "",
    ReportType: reportType,
    VacationType: reportType === "Vacation" ? safeText(payload.vacationType, 100) : "",
    ProductID: product?.ProductID || "",
    ProductName: product?.ProductName || "",
    TargetPieces: product?.targetPieces || "",
    ActualPieces: product?.actualPieces || "",
    Amount: reportType === "Vouchers" && isFirst
      ? requireEnteredNonNegativeInteger(payload.vouchers, "Vouchers")
      : "",
    PostiveConsumer: positiveConsumers,
    NegativeConsumer: negativeConsumers,
    TotalConsumer: hasConsumerFields ? positiveConsumers + negativeConsumers : "",
    TargetConsumer: isFirst && targetConsumers ? targetConsumers : "",
    Notes: isFirst ? safeText(payload.notes) : "",
    CreatedAt: new Date().toISOString(),
  };
}

async function createReport(user, payload) {
  const reportType = canonicalReportType(payload.reportType);
  if (!reportType || !REPORT_TYPES.has(reportType)) throw new Error("Choose a valid report type");

  const date = toDate(payload.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Report date must be in YYYY-MM-DD format");

  const [reportSheet, branchSheet, productSheet, targetSheet, vacationTypeSheet, supervisorSheet] = await Promise.all([
    getSheetRows(REPORT_SHEET),
    getSheetRows("Branches"),
    getSheetRows("Products"),
    getSheetRows("Targets"),
    getSheetRows("VacationType"),
    getSheetRows("Supervisors"),
  ]);

  const branch = reportType === "Vacation"
    ? null
    : branchSheet.rows.find(
      (item) => String(item.BranchID || "").trim() === String(payload.branchId || "").trim()
    );
  if (reportType !== "Vacation" && !branch) throw new Error("Choose a valid branch");

  const supervisor = supervisorSheet.rows.find(
    (item) => String(item.SupervisorsID || "").trim() === String(payload.supervisorId || "").trim()
  );
  if (!supervisor) throw new Error("Choose a valid supervisor");

  if (reportType === "Vacation") {
    const validVacation = vacationTypeSheet.rows.some((item) => String(item.VacationType || "").trim() === safeText(payload.vacationType, 100));
    if (!validVacation) throw new Error("Choose a valid vacation type");
  }

  if (reportType !== "Vacation") {
    requireEnteredNonNegativeInteger(payload.positiveConsumers, "Positive consumers");
    requireEnteredNonNegativeInteger(payload.negativeConsumers, "Negative consumers");
  }
  if (reportType === "Vouchers") requireEnteredNonNegativeInteger(payload.vouchers, "Vouchers");

  const annualVacation = reportType === "Vacation" && isAnnualVacation(payload.vacationType);
  const vacationSheet = annualVacation ? await getSheetRows("VacationDelegate") : null;
  if (annualVacation && !vacationSheet.rows.some((row) => matchesDelegate(row, user.delegateId || user.id))) {
    throw new Error("No annual-leave balance was found for this delegate in VacationDelegate");
  }

  const { productTargets, targetConsumers } = reportType === "Vacation"
    ? { productTargets: new Map(), targetConsumers: 0 }
    : getTargetsForDate(targetSheet.rows, user, date, branch);
  const productCatalog = new Map(productSheet.rows.map((product) => [String(product.ProductID || "").trim(), product]));
  const seenProductIds = new Set();
  const submittedProducts = (Array.isArray(payload.products) ? payload.products : []).map((submitted) => {
    const productId = String(submitted?.productId || "").trim();
    const actualPieces = requireNonNegativeInteger(submitted?.actualPieces, "Actual pieces");
    if (!productId || !productCatalog.has(productId)) throw new Error("One or more selected products are invalid");
    if (seenProductIds.has(productId)) throw new Error("A product can only be added once per report");
    seenProductIds.add(productId);
    return { ...productCatalog.get(productId), actualPieces, targetPieces: productTargets.get(productId) || 0 };
  }).filter((product) => product.actualPieces > 0);
  const products = reportType === "Vacation" ? [null] : submittedProducts;

  if (!products.length) throw new Error("Add at least one product with a value before submitting");

  const reportId = randomUUID();
  const records = products.map((product, index) => buildRecord({
    user, payload, reportType, date, branch, supervisor, product, isFirst: index === 0, reportId, targetConsumers,
  }));

  const sheetUpdate = await appendSheetRows(REPORT_SHEET, reportSheet.headers, records);
  const vacationUpdate = annualVacation
    ? await syncVacationDelegateBalance(vacationSheet, user.delegateId || user.id, [...reportSheet.rows, ...records], {
      date,
      incrementMonth: true,
    })
    : null;

  return { reportId, records, sheetUpdate, vacationUpdate };
}

module.exports = { createReport, getReportsForDelegate, getTargetSummary, getTargetSummaryForDate, makeSummary, buildMonthlyAggregate };
