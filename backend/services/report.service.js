const { randomUUID } = require("crypto");
const {
  appendSheetRows,
  currentMonth,
  ensureSheetHeaders,
  getSheetRows,
  toDate,
  toMonth,
  toNumber,
  updateSheetRow,
} = require("./sheets.service");
const { buildProductNameToIdMap, getTargetRowProductTargets, getTargetRowTotalPieces, matchesDelegateRow } = require("./target.service");
const { canonicalReportType } = require("../utils/report-types");
const { isAnnualVacation, syncVacationDelegateBalance } = require("./vacation.service");
const { createProductOrder } = require("../utils/product-order");
const {
  UNIT_PRICE_SHEET,
  createUnitPriceCatalog,
  getMonthlyUnitPrice,
  hasValidUnitPrice,
} = require("./unit-price.service");

const REPORT_SHEET = "Reports";
const REPORT_TYPES = new Set(["Sales", "Vouchers", "Vacation"]);
const REPORT_AUDIT_HEADERS = ["LastModifiedAt", "LastModifiedBy", "ModificationType", "EditCount"];

function reportMonth(report) {
  const month = toMonth(report.Month);
  return /^\d{4}-\d{2}$/.test(month) ? month : toMonth(report.Date);
}

function targetMonth(target) {
  const month = toMonth(target.Month);
  return /^\d{4}-\d{2}$/.test(month) ? month : toMonth(target.Date);
}

function matchesDelegate(report, delegateId) {
  return matchesDelegateRow(report, delegateId);
}

function normalizeTargetValue(value) {
  return String(value ?? "").trim();
}

function hasValue(value) {
  return String(value ?? "").trim() !== "";
}

function voucherValue(report) {
  return toNumber(hasValue(report.Vouchers) ? report.Vouchers : report.Amount);
}

function resolveReportPricing(report, catalog, unitPriceCatalog) {
  const product = catalog.get(String(report.ProductID || "").trim()) || {};
  const monthlyPrice = getMonthlyUnitPrice(unitPriceCatalog, report.ProductID, report.Date || report.Month);
  const hasStoredPrice = hasValidUnitPrice(report.UnitPrice);
  const hasMonthlyPrice = monthlyPrice.isConfigured;
  const hasCatalogPrice = hasValidUnitPrice(product.UnitPrice);
  const unitPrice = hasStoredPrice
    ? toNumber(report.UnitPrice)
    : hasMonthlyPrice
      ? monthlyPrice.unitPrice
    : hasCatalogPrice
      ? toNumber(product.UnitPrice)
      : 0;
  const hasStoredSalesValue = hasValue(report.SalesValue);

  return {
    ...report,
    UnitPrice: hasStoredPrice || hasMonthlyPrice || hasCatalogPrice ? unitPrice : "",
    UnitPriceMonth: monthlyPrice.month,
    SalesValue: hasStoredSalesValue
      ? toNumber(report.SalesValue)
      : unitPrice
        ? toNumber(report.ActualPieces) * unitPrice
        : "",
  };
}

function resolveReportsPricing(reports, products, unitPriceRows) {
  const productCatalog = new Map(products.map((product) => [String(product.ProductID || "").trim(), product]));
  const unitPriceCatalog = createUnitPriceCatalog(unitPriceRows);
  return reports.map((report) => resolveReportPricing(report, productCatalog, unitPriceCatalog));
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
      summary.vouchers += type === "Vouchers" ? voucherValue(report) : 0;
      summary.salesValue += type === "Vacation" ? 0 : toNumber(report.SalesValue);
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
      salesValue: 0,
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
  const productNameToId = buildProductNameToIdMap(products);
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
        salesValue: 0,
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

    const rowProductTargets = getTargetRowProductTargets(target, productNameToId);
    rowProductTargets.forEach((amount, productId) => {
      ensureProduct(productId, target).targetPieces += amount;
    });
  });

  reports.forEach((report) => {
    const productId = String(report.ProductID || "").trim();
    if (!productId) return;
    const product = ensureProduct(productId, report);
    product.actualPieces += toNumber(report.ActualPieces);
    product.salesValue += toNumber(report.SalesValue);
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
      salesValue: 0,
      products: [],
    };
    current.actualPieces += product.actualPieces;
    current.targetPieces += product.targetPieces;
    current.salesValue += product.salesValue;
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
    salesValue: reportSummary.salesValue,
    reports: reportSummary.count,
    categories,
  };
}

async function getReportsForDelegate(user, { month, type, all = false } = {}) {
  const [reportSheet, targetSheet, productSheet, unitPriceSheet] = await Promise.all([
    getSheetRows(REPORT_SHEET),
    getSheetRows("Targets"),
    getSheetRows("Products"),
    getSheetRows(UNIT_PRICE_SHEET),
  ]);
  const targetProductNameToId = buildProductNameToIdMap(productSheet.rows);
  const { rows } = reportSheet;
  const selectedMonth = all ? null : (month || currentMonth());
  const selectedType = type ? canonicalReportType(type) : null;
  const delegateId = user.delegateId || user.id;
  const reportsForMonth = rows.filter((report) => matchesDelegate(report, delegateId) && (all || reportMonth(report) === selectedMonth));
  const withResolvedTargets = (matchingReports) => resolveReportTargetValues(
    resolveReportsPricing(matchingReports, productSheet.rows, unitPriceSheet.rows),
    targetSheet.rows,
    targetProductNameToId,
    user
  );
  const reports = orderByDate(withResolvedTargets(reportsForMonth.filter((report) => !type || report.ReportType === selectedType)));
  const monthlyAggregate = buildMonthlyAggregate(
    withResolvedTargets(reportsForMonth),
    targetSheet.rows,
    productSheet.rows,
    delegateId,
    selectedMonth
  );

  return { reports, summary: makeSummary(reports), monthlyAggregate, month: selectedMonth || "all" };
}

async function getTargetSummary(user, month = currentMonth()) {
  const [targetSheet, productSheet] = await Promise.all([
    getSheetRows("Targets"),
    getSheetRows("Products"),
  ]);
  const delegateId = user.delegateId || user.id;
  const customerTargetsByDay = new Map();
  let targetPieces = 0;
  const productNameToId = buildProductNameToIdMap(productSheet.rows);

  targetSheet.rows.forEach((target) => {
    if (!matchesDelegate(target, delegateId) || targetMonth(target) !== month) return;
    targetPieces += getTargetRowTotalPieces(target, productNameToId);
    const dayKey = `${toDate(target.Date) || String(target.Month || month)}-${targetBranchKey(target)}`;
    customerTargetsByDay.set(dayKey, Math.max(customerTargetsByDay.get(dayKey) || 0, toNumber(target.TargetConsumer)));
  });

  return {
    targetPieces,
    targetConsumers: [...customerTargetsByDay.values()].reduce((total, value) => total + value, 0),
  };
}

async function getTargetSummaryForDate(user, date) {
  const [targetSheet, productSheet] = await Promise.all([
    getSheetRows("Targets"),
    getSheetRows("Products"),
  ]);
  const targetProductNameToId = buildProductNameToIdMap(productSheet.rows);
  const { productTargets, targetConsumers } = getTargetsForDate(targetSheet.rows, user, date, undefined, targetProductNameToId);
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

function getTargetsForDate(targets, userOrDelegate, date, branch, productNameToId = new Map()) {
  const delegateId = typeof userOrDelegate === "string"
    ? String(userOrDelegate).trim()
    : String(userOrDelegate?.delegateId || userOrDelegate?.id || userOrDelegate?.DelegateID || userOrDelegate?.DelegateId || userOrDelegate?.delegateId || "").trim();
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

    const rowProductTargets = getTargetRowProductTargets(target, productNameToId);
    rowProductTargets.forEach((amount, productId) => {
      productTargets.set(productId, (productTargets.get(productId) || 0) + amount);
    });
  });

  return {
    productTargets,
    targetConsumers: [...customerTargetsByBranch.values()].reduce((total, value) => total + value, 0),
  };
}

function resolveReportTargetValues(reports, targetSheetRows, productNameToId, userOrDelegate = null) {
  const cache = new Map();

  return reports.map((report) => {
    const date = toDate(report.Date);
    const branch = { BranchID: report.BranchID, BranchName: report.BranchName };
    const delegateId = String(report.DelegateID || report.DelegateId || report.delegateId || "").trim();
    const delegateReference = delegateId || userOrDelegate;
    const cacheKey = `${String(delegateReference || "")}||${date}||${String(report.BranchID || "")}||${String(report.BranchName || "")}`;
    let resolved = cache.get(cacheKey);
    if (!resolved) {
      resolved = getTargetsForDate(targetSheetRows, delegateReference, date, branch, productNameToId);
      cache.set(cacheKey, resolved);
    }

    const hasTargetConsumer = report.TargetConsumer != null && String(report.TargetConsumer).trim() !== "";
    const productId = String(report.ProductID || "").trim();
    const resolvedTargetPieces = resolved.productTargets.get(productId);
    const hasTargetPieces = report.TargetPieces != null && String(report.TargetPieces).trim() !== "";

    return {
      ...report,
      TargetConsumer: hasTargetConsumer ? toNumber(report.TargetConsumer) : resolved.targetConsumers,
      TargetPieces: hasTargetPieces ? report.TargetPieces : resolvedTargetPieces != null ? resolvedTargetPieces : "",
    };
  });
}

function buildRecord({ user, payload, reportType, date, branch, supervisor, product, isFirst, reportId, targetConsumers, audit = {} }) {
  const hasConsumerFields = reportType !== "Vacation" && isFirst;
  const positiveConsumers = hasConsumerFields
    ? requireEnteredNonNegativeInteger(payload.positiveConsumers, "Positive consumers")
    : "";
  const negativeConsumers = hasConsumerFields
    ? requireEnteredNonNegativeInteger(payload.negativeConsumers, "Negative consumers")
    : "";
  const hasUnitPrice = product && hasValue(product.UnitPrice);
  const unitPrice = hasUnitPrice ? toNumber(product.UnitPrice) : "";
  const salesValue = hasUnitPrice ? product.actualPieces * unitPrice : "";

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
    TargetPieces: product?.targetPieces != null ? product.targetPieces : "",
    ActualPieces: product?.actualPieces != null ? product.actualPieces : "",
    Vouchers: reportType === "Vouchers" && isFirst
      ? requireEnteredNonNegativeInteger(payload.vouchers, "Vouchers")
      : "",
    UnitPrice: unitPrice,
    SalesValue: salesValue,
    PostiveConsumer: positiveConsumers,
    NegativeConsumer: negativeConsumers,
    TotalConsumer: hasConsumerFields ? positiveConsumers + negativeConsumers : "",
    TargetConsumer: isFirst && targetConsumers != null ? targetConsumers : "",
    Notes: isFirst ? safeText(payload.notes) : "",
    CreatedAt: audit.createdAt || new Date().toISOString(),
    LastModifiedAt: audit.lastModifiedAt || "",
    LastModifiedBy: audit.lastModifiedBy || "",
    ModificationType: audit.modificationType || "إنشاء التقرير",
    EditCount: audit.editCount ?? 0,
  };
}

function reportMatchesDateAndType(report, delegateId, date, reportType, excludedReportId = "") {
  if (!matchesDelegate(report, delegateId)) return false;
  if (toDate(report.Date) !== date) return false;
  if (canonicalReportType(report.ReportType) !== reportType) return false;
  return String(report.UUID || "").trim() !== String(excludedReportId || "").trim();
}

function ensureNoDuplicateReport(rows, user, date, reportType, excludedReportId = "") {
  const delegateId = user.delegateId || user.id;
  if (rows.some((report) => reportMatchesDateAndType(report, delegateId, date, reportType, excludedReportId))) {
    throw new Error("يوجد تقرير من نفس النوع مسجل بالفعل لهذا التاريخ. افتحيه من تقاريري للتعديل بدلًا من إضافة زيارة جديدة.");
  }
}

function productQuantities(rows) {
  return rows
    .filter((report) => String(report.ProductID || "").trim())
    .map((report) => `${String(report.ProductID).trim()}:${toNumber(report.ActualPieces)}`)
    .sort()
    .join("|");
}

function modificationType(existingRows, { reportType, date, branch, supervisor, payload, products }) {
  const first = existingRows[0] || {};
  const changes = [];
  if (toDate(first.Date) !== date) changes.push("التاريخ");
  if (canonicalReportType(first.ReportType) !== reportType) changes.push("نوع التقرير");
  if (String(first.BranchID || "").trim() !== String(branch?.BranchID || "").trim()) changes.push("الفرع");
  if (String(first.SupervisorsID || "").trim() !== String(supervisor?.SupervisorsID || "").trim()) changes.push("المشرف");
  if (safeText(first.VacationType, 100) !== safeText(payload.vacationType, 100)) changes.push("نوع الإجازة");
  if (toNumber(first.PostiveConsumer) !== toNumber(payload.positiveConsumers) || toNumber(first.NegativeConsumer) !== toNumber(payload.negativeConsumers)) {
    changes.push("بيانات العملاء");
  }
  if (voucherValue(first) !== toNumber(payload.vouchers)) changes.push("عدد الفواتشر");
  if (safeText(first.Notes) !== safeText(payload.notes)) changes.push("الملاحظات");
  if (productQuantities(existingRows) !== products.map((product) => `${product.ProductID}:${product.actualPieces}`).sort().join("|")) {
    changes.push("المنتجات والكميات");
  }
  return changes.length ? `تعديل: ${changes.join("، ")}` : "مراجعة دون تغيير البيانات";
}

function reportAudit(user, existingRows = [], modification = "إنشاء التقرير") {
  const now = new Date().toISOString();
  if (!existingRows.length) {
    return { createdAt: now, modificationType: modification, editCount: 0 };
  }

  const first = existingRows[0];
  const editCount = Math.max(0, ...existingRows.map((row) => toNumber(row.EditCount))) + 1;
  const editorName = safeText(user.name || user.delegateName, 120);
  const editorId = safeText(user.delegateId || user.id, 80);
  return {
    createdAt: first.CreatedAt || now,
    lastModifiedAt: now,
    lastModifiedBy: [editorName, editorId].filter(Boolean).join(" - "),
    modificationType: modification,
    editCount,
  };
}

function emptyProductRecord(record) {
  return {
    ...record,
    ProductID: "",
    ProductName: "",
    TargetPieces: "",
    ActualPieces: "",
    Vouchers: "",
    UnitPrice: "",
    SalesValue: "",
    PostiveConsumer: "",
    NegativeConsumer: "",
    TotalConsumer: "",
    TargetConsumer: "",
    Notes: "",
  };
}

async function prepareReport(user, payload, reportSheet, { excludedReportId = "" } = {}) {
  const reportType = canonicalReportType(payload.reportType);
  if (!reportType || !REPORT_TYPES.has(reportType)) throw new Error("Choose a valid report type");

  const date = toDate(payload.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Report date must be in YYYY-MM-DD format");

  ensureNoDuplicateReport(reportSheet.rows, user, date, reportType, excludedReportId);

  const [branchSheet, productSheet, targetSheet, vacationTypeSheet, supervisorSheet, unitPriceSheet] = await Promise.all([
    getSheetRows("Branches"),
    getSheetRows("Products"),
    getSheetRows("Targets"),
    getSheetRows("VacationType"),
    getSheetRows("Supervisors"),
    getSheetRows(UNIT_PRICE_SHEET),
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

  const targetProductNameToId = buildProductNameToIdMap(productSheet.rows);
  const { productTargets, targetConsumers } = reportType === "Vacation"
    ? { productTargets: new Map(), targetConsumers: 0 }
    : getTargetsForDate(targetSheet.rows, user, date, branch, targetProductNameToId);
  const productCatalog = new Map(productSheet.rows.map((product) => [String(product.ProductID || "").trim(), product]));
  const unitPriceCatalog = createUnitPriceCatalog(unitPriceSheet.rows);
  const seenProductIds = new Set();
  const submittedProducts = (Array.isArray(payload.products) ? payload.products : []).map((submitted) => {
    const productId = String(submitted?.productId || "").trim();
    const actualPieces = requireNonNegativeInteger(submitted?.actualPieces, "Actual pieces");
    if (!productId || !productCatalog.has(productId)) throw new Error("One or more selected products are invalid");
    if (seenProductIds.has(productId)) throw new Error("A product can only be added once per report");
    seenProductIds.add(productId);
    const product = productCatalog.get(productId);
    const monthlyPrice = getMonthlyUnitPrice(unitPriceCatalog, productId, date);
    if (!monthlyPrice.isConfigured) {
      throw new Error(`Missing UnitPrice for ${product.ProductName || productId} in ${monthlyPrice.month || "the selected month"}`);
    }
    return {
      ...product,
      UnitPrice: monthlyPrice.unitPrice,
      actualPieces,
      targetPieces: productTargets.get(productId) || 0,
    };
  }).filter((product) => product.actualPieces > 0);
  const products = reportType === "Vacation" ? [null] : submittedProducts;

  if (!products.length) throw new Error("Add at least one product with a value before submitting");

  return { reportType, date, branch, supervisor, annualVacation, vacationSheet, targetConsumers, products };
}

async function createReport(user, payload) {
  const reportSheet = await getSheetRows(REPORT_SHEET);
  const requestedReportId = safeText(payload?.reportId, 100);
  if (requestedReportId) {
    const matchingRecords = reportSheet.rows.filter((report) => String(report.UUID || "").trim() === requestedReportId);
    if (matchingRecords.length) {
      if (!matchingRecords.every((report) => matchesDelegate(report, user.delegateId || user.id))) {
        throw new Error("This report identifier is already in use");
      }
      return {
        reportId: requestedReportId,
        records: matchingRecords,
        sheetUpdate: { updatedRows: 0, updatedRange: "" },
        vacationUpdate: null,
        alreadySaved: true,
      };
    }
  }
  const prepared = await prepareReport(user, payload, reportSheet);
  const reportId = requestedReportId || randomUUID();
  const audit = reportAudit(user);
  const records = prepared.products.map((product, index) => buildRecord({
    user,
    payload,
    ...prepared,
    product,
    isFirst: index === 0,
    reportId,
    audit,
  }));

  const headers = await ensureSheetHeaders(REPORT_SHEET, REPORT_AUDIT_HEADERS);
  const sheetUpdate = await appendSheetRows(REPORT_SHEET, headers, records);
  const vacationUpdate = prepared.annualVacation
    ? await syncVacationDelegateBalance(prepared.vacationSheet, user.delegateId || user.id, [...reportSheet.rows, ...records], {
      date: prepared.date,
      incrementMonth: true,
    })
    : null;

  return { reportId, records, sheetUpdate, vacationUpdate };
}

async function getReportForDelegate(user, reportId) {
  const { rows } = await getSheetRows(REPORT_SHEET);
  const normalizedId = safeText(reportId, 100);
  const reports = rows.filter((report) => matchesDelegate(report, user.delegateId || user.id) && String(report.UUID || "").trim() === normalizedId);
  if (!reports.length) {
    const error = new Error("Report not found");
    error.statusCode = 404;
    throw error;
  }
  return { reportId: normalizedId, reports: orderByDate(reports).map((report) => ({ ...report, Date: toDate(report.Date) })) };
}

async function updateReport(user, reportId, payload) {
  const reportSheet = await getSheetRows(REPORT_SHEET);
  const normalizedId = safeText(reportId, 100);
  const existingIndexes = reportSheet.rows
    .map((report, index) => (matchesDelegate(report, user.delegateId || user.id) && String(report.UUID || "").trim() === normalizedId ? index : -1))
    .filter((index) => index !== -1);
  if (!existingIndexes.length) {
    const error = new Error("Report not found");
    error.statusCode = 404;
    throw error;
  }

  const existingRows = existingIndexes.map((index) => reportSheet.rows[index]);
  const prepared = await prepareReport(user, payload, reportSheet, { excludedReportId: normalizedId });
  const audit = reportAudit(user, existingRows, modificationType(existingRows, { ...prepared, payload }));
  const records = prepared.products.map((product, index) => buildRecord({
    user,
    payload,
    ...prepared,
    product,
    isFirst: index === 0,
    reportId: normalizedId,
    audit,
  }));
  const headers = await ensureSheetHeaders(REPORT_SHEET, REPORT_AUDIT_HEADERS);
  const updatedRecords = existingIndexes.map((_, index) => records[index] || emptyProductRecord(records[0]));
  const updates = await Promise.all(existingIndexes.map((rowIndex, index) => updateSheetRow(
    REPORT_SHEET,
    headers,
    reportSheet.rowNumbers[rowIndex],
    updatedRecords[index]
  )));
  const appendedRecords = records.slice(existingIndexes.length);
  const appended = appendedRecords.length ? await appendSheetRows(REPORT_SHEET, headers, appendedRecords) : null;

  const previousWasAnnualVacation = existingRows.some((report) => report.ReportType === "Vacation" && isAnnualVacation(report.VacationType));
  const vacationUpdate = previousWasAnnualVacation || prepared.annualVacation
    ? await syncVacationDelegateBalance(
      prepared.vacationSheet || await getSheetRows("VacationDelegate"),
      user.delegateId || user.id,
      [...reportSheet.rows.filter((report) => String(report.UUID || "").trim() !== normalizedId), ...records],
      { date: prepared.date, reconcile: true }
    )
    : null;
  const updatedRows = updates.reduce((total, update) => total + (update.updatedRows || 0), 0) + (appended?.updatedRows || 0);
  const updatedRange = [updates[0]?.updatedRange, appended?.updatedRange].filter(Boolean).join(", ");

  return {
    reportId: normalizedId,
    records,
    sheetUpdate: { updatedRows, updatedRange },
    vacationUpdate,
    audit,
  };
}

module.exports = { createReport, getReportForDelegate, getReportsForDelegate, getTargetSummary, getTargetSummaryForDate, makeSummary, buildMonthlyAggregate, resolveReportsPricing, resolveReportTargetValues, updateReport };
