const { currentDate, getSheetRows, toDate, toMonth, toNumber } = require("./sheets.service");
const { getReportsForDelegate, getTargetSummaryForDate, makeSummary } = require("./report.service");
const { getAnnualVacationDays, getVacationSummary } = require("./vacation.service");
const { createProductOrder } = require("../utils/product-order");
const { getShortageAnalytics } = require("./shortage.service");

function matchesDelegate(row, delegateId) {
  return String(row.DelegateID || "").trim() === String(delegateId || "").trim();
}

function reportId(report) {
  return report.UUID || `${report.Date}-${report.BranchID}-${report.ReportType}`;
}

function branchKey(row) {
  return String(row.BranchName || row.BranchID || "all-branches").trim();
}

function dayLabel(date) {
  return toDate(date).slice(-2) || "-";
}

function buildCustomerDays(reports, targets, delegateId, month) {
  const byDay = new Map();
  const reportGroups = new Set();

  targets.forEach((target) => {
    if (!matchesDelegate(target, delegateId) || toMonth(target.Month || target.Date) !== month) return;
    const date = toDate(target.Date);
    if (!date) return;
    const day = byDay.get(date) || { date, label: dayLabel(date), targetBranches: new Map(), actual: 0 };
    const key = branchKey(target);
    day.targetBranches.set(key, Math.max(day.targetBranches.get(key) || 0, toNumber(target.TargetConsumer)));
    byDay.set(date, day);
  });

  reports.forEach((report) => {
    const date = toDate(report.Date);
    if (!date || reportGroups.has(reportId(report))) return;
    reportGroups.add(reportId(report));
    const day = byDay.get(date) || { date, label: dayLabel(date), targetBranches: new Map(), actual: 0 };
    day.actual += toNumber(report.TotalConsumer);
    byDay.set(date, day);
  });

  return [...byDay.values()]
    .map((day) => ({
      date: day.date,
      label: day.label,
      target: [...day.targetBranches.values()].reduce((total, value) => total + value, 0),
      actual: day.actual,
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function buildProductPerformance(reports, targets, products, delegateId, month) {
  const catalog = new Map(products.map((product) => [String(product.ProductID || "").trim(), product]));
  const productOrder = createProductOrder(products);
  const performance = new Map();

  function ensure(productId, fallbackName = "") {
    if (!performance.has(productId)) {
      const product = catalog.get(productId) || {};
      performance.set(productId, {
        productId,
        productName: product.ProductName || fallbackName || productId,
        category: product.Category || "منتجات أخرى",
        target: 0,
        actual: 0,
        salesValue: 0,
      });
    }
    return performance.get(productId);
  }

  targets.forEach((target) => {
    if (!matchesDelegate(target, delegateId) || (month && toMonth(target.Month || target.Date) !== month)) return;
    const productId = String(target.ProductID || "").trim();
    if (!productId) return;
    ensure(productId, target.ProductName).target += toNumber(target.TargetPieces);
  });

  reports.forEach((report) => {
    const productId = String(report.ProductID || "").trim();
    if (!productId) return;
    const product = ensure(productId, report.ProductName);
    product.actual += toNumber(report.ActualPieces);
    product.salesValue += toNumber(report.SalesValue);
  });

  return [...performance.values()]
    .filter((product) => product.target || product.actual)
    .map((product) => ({
      ...product,
      achievement: product.target ? Math.round((product.actual / product.target) * 100) : 0,
    }))
    .sort(productOrder.compareProducts);
}

function getCustomerTargetTotal(targets, delegateId, month) {
  const targetsByDayBranch = new Map();
  targets.forEach((target) => {
    if (!matchesDelegate(target, delegateId) || (month && toMonth(target.Month || target.Date) !== month)) return;
    const date = toDate(target.Date) || String(target.Month || "");
    if (!date) return;
    const key = `${date}-${branchKey(target)}`;
    targetsByDayBranch.set(key, Math.max(targetsByDayBranch.get(key) || 0, toNumber(target.TargetConsumer)));
  });
  return [...targetsByDayBranch.values()].reduce((total, value) => total + value, 0);
}

function buildCumulativeDetails(reports, targets, products, delegateId) {
  const productsData = buildProductPerformance(reports, targets, products, delegateId, null);
  const productOrder = createProductOrder(products);
  const categoryTotals = new Map();
  productsData.forEach((product) => {
    const current = categoryTotals.get(product.category) || { category: product.category, target: 0, actual: 0, salesValue: 0 };
    current.target += product.target;
    current.actual += product.actual;
    current.salesValue += product.salesValue;
    categoryTotals.set(product.category, current);
  });
  const categories = [...categoryTotals.values()].map((category) => ({
    ...category,
    achievement: category.target ? Math.round((category.actual / category.target) * 100) : 0,
  })).sort(productOrder.compareCategories);
  const summary = makeSummary(reports);
  const targetPieces = productsData.reduce((total, product) => total + product.target, 0);
  const targetConsumers = getCustomerTargetTotal(targets, delegateId, null);

  return {
    actualPieces: summary.actualPieces,
    targetPieces,
    totalConsumers: summary.totalConsumers,
    targetConsumers,
    vouchers: summary.vouchers,
    salesValue: summary.salesValue,
    reports: summary.count,
    piecesAchievement: targetPieces ? Math.round((summary.actualPieces / targetPieces) * 100) : 0,
    consumersAchievement: targetConsumers ? Math.round((summary.totalConsumers / targetConsumers) * 100) : 0,
    categories,
    products: productsData,
  };
}

function buildProductDays(reports, targets, products, delegateId, month) {
  const catalog = new Map(products.map((product) => [String(product.ProductID || "").trim(), product]));
  const productOrder = createProductOrder(products);
  const byProductDay = new Map();

  function ensure(date, productId, fallbackName = "") {
    const key = `${date}-${productId}`;
    if (!byProductDay.has(key)) {
      const product = catalog.get(productId) || {};
      byProductDay.set(key, {
        date,
        label: dayLabel(date),
        productId,
        productName: product.ProductName || fallbackName || productId,
        category: product.Category || "منتجات أخرى",
        target: 0,
        actual: 0,
      });
    }
    return byProductDay.get(key);
  }

  targets.forEach((target) => {
    if (!matchesDelegate(target, delegateId) || toMonth(target.Month || target.Date) !== month) return;
    const date = toDate(target.Date);
    const productId = String(target.ProductID || "").trim();
    if (!date || !productId) return;
    ensure(date, productId, target.ProductName).target += toNumber(target.TargetPieces);
  });

  reports.forEach((report) => {
    const date = toDate(report.Date);
    const productId = String(report.ProductID || "").trim();
    if (!date || !productId) return;
    ensure(date, productId, report.ProductName).actual += toNumber(report.ActualPieces);
  });

  return [...byProductDay.values()].sort((left, right) => left.date.localeCompare(right.date) || productOrder.compareProducts(left, right));
}

function buildAnalyticsOverview(reports, productPerformance, customerDays) {
  const summary = makeSummary(reports);
  const targetPieces = productPerformance.reduce((total, product) => total + product.target, 0);
  const targetConsumers = customerDays.reduce((total, day) => total + day.target, 0);
  const reportDays = new Set();
  const reportIds = new Set();

  reports.forEach((report) => {
    const id = reportId(report);
    if (reportIds.has(id)) return;
    reportIds.add(id);
    const date = toDate(report.Date);
    if (date) reportDays.add(date);
  });

  const categories = new Map();
  productPerformance.forEach((product) => {
    const category = product.category || "منتجات أخرى";
    const current = categories.get(category) || { category, actual: 0, target: 0, salesValue: 0 };
    current.actual += product.actual;
    current.target += product.target;
    current.salesValue += product.salesValue;
    categories.set(category, current);
  });

  return {
    actualPieces: summary.actualPieces,
    targetPieces,
    piecesAchievement: targetPieces ? Math.round((summary.actualPieces / targetPieces) * 100) : 0,
    totalConsumers: summary.totalConsumers,
    targetConsumers,
    consumersAchievement: targetConsumers ? Math.round((summary.totalConsumers / targetConsumers) * 100) : 0,
    positiveConsumers: summary.positiveConsumers,
    negativeConsumers: summary.negativeConsumers,
    vouchers: summary.vouchers,
    salesValue: summary.salesValue,
    reports: summary.count,
    activeDays: reportDays.size,
    categories: [...categories.values()].map((category) => ({
      ...category,
      achievement: category.target ? Math.round((category.actual / category.target) * 100) : 0,
    })),
  };
}

function buildDailyProductDetails(reports, products) {
  const catalog = new Map(products.map((product) => [String(product.ProductID || "").trim(), product]));
  const productOrder = createProductOrder(products);
  const productTotals = new Map();

  reports.forEach((report) => {
    const productId = String(report.ProductID || "").trim();
    if (!productId) return;
    const catalogProduct = catalog.get(productId) || {};
    const current = productTotals.get(productId) || {
      productId,
      productName: catalogProduct.ProductName || report.ProductName || productId,
      category: catalogProduct.Category || "منتجات أخرى",
      target: 0,
      actual: 0,
      salesValue: 0,
    };
    current.target += toNumber(report.TargetPieces);
    current.actual += toNumber(report.ActualPieces);
    current.salesValue += toNumber(report.SalesValue);
    productTotals.set(productId, current);
  });

  const productsData = [...productTotals.values()].map((product) => ({
    ...product,
    achievement: product.target ? Math.round((product.actual / product.target) * 100) : 0,
  })).sort(productOrder.compareProducts);

  const categoryTotals = new Map();
  productsData.forEach((product) => {
    const current = categoryTotals.get(product.category) || { category: product.category, target: 0, actual: 0, salesValue: 0 };
    current.target += product.target;
    current.actual += product.actual;
    current.salesValue += product.salesValue;
    categoryTotals.set(product.category, current);
  });

  return {
    categories: [...categoryTotals.values()].map((category) => ({
      ...category,
      achievement: category.target ? Math.round((category.actual / category.target) * 100) : 0,
    })).sort(productOrder.compareCategories),
    products: productsData,
  };
}

async function getDashboardData(user, { month } = {}) {
  const date = currentDate();
  const selectedMonth = toMonth(month) || toMonth(date);
  const delegateId = user.delegateId || user.id;

  const [{ reports: monthReports }, { reports: allReports }, targetSheet, productSheet, vacationSheet, shortages] = await Promise.all([
    getReportsForDelegate(user, { month: selectedMonth }),
    getReportsForDelegate(user, { all: true }),
    getSheetRows("Targets"),
    getSheetRows("Products"),
    getSheetRows("VacationDelegate"),
    getShortageAnalytics(user, { month: selectedMonth }),
  ]);

  const reports = monthReports.filter((report) => toDate(report.Date) === date);
  const vacationDays = getAnnualVacationDays(allReports, delegateId);
  const customerDays = buildCustomerDays(monthReports, targetSheet.rows, delegateId, selectedMonth);
  const productPerformance = buildProductPerformance(monthReports, targetSheet.rows, productSheet.rows, delegateId, selectedMonth);
  const productDays = buildProductDays(monthReports, targetSheet.rows, productSheet.rows, delegateId, selectedMonth);
  const reportSummary = makeSummary(reports);
  const reportsSummary = makeSummary(monthReports);
  const targets = await getTargetSummaryForDate(user, date);
  const summary = {
    ...reportSummary,
    ...targets,
    piecesAchievement: targets.targetPieces ? Math.round((reportSummary.actualPieces / targets.targetPieces) * 100) : 0,
    consumersAchievement: targets.targetConsumers ? Math.round((reportSummary.totalConsumers / targets.targetConsumers) * 100) : 0,
  };

  return {
    date,
    summary,
    reportsSummary,
    cumulative: buildCumulativeDetails(allReports, targetSheet.rows, productSheet.rows, delegateId),
    vacation: {
      ...getVacationSummary(vacationSheet.rows, delegateId, allReports),
      days: vacationDays,
    },
    charts: {
      month: selectedMonth,
      overview: buildAnalyticsOverview(monthReports, productPerformance, customerDays),
      customerDays,
      products: productPerformance,
      productDays,
      shortages,
    },
    today: {
      reports: reportSummary.count,
      positiveConsumers: reportSummary.positiveConsumers,
      negativeConsumers: reportSummary.negativeConsumers,
      vouchers: reportSummary.vouchers,
      salesValue: reportSummary.salesValue,
    },
    dailyDetails: buildDailyProductDetails(reports, productSheet.rows),
  };
}

module.exports = { getDashboardData };
