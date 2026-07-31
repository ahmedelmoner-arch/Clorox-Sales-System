const { currentMonth, getSheetRows, toDate, toMonth, toNumber } = require("./sheets.service");
const { canonicalRole } = require("../utils/roles");
const { buildMonthlyAggregate, resolveReportsPricing } = require("./report.service");
const { UNIT_PRICE_SHEET } = require("./unit-price.service");
const { createProductOrder } = require("../utils/product-order");

function text(value) {
  return String(value ?? "").trim();
}

function key(value) {
  return text(value).toUpperCase();
}

function rowMonth(row) {
  const month = toMonth(row.Month);
  return /^\d{4}-\d{2}$/.test(month) ? month : toMonth(row.Date);
}

function branchKey(row) {
  return text(row.BranchName) || text(row.BranchID) || "all-branches";
}

function reportKey(row) {
  return text(row.UUID) || `${row.Date}-${row.DelegateID}-${row.BranchID}-${row.ReportType}`;
}

function withAchievement(metrics) {
  return {
    ...metrics,
    piecesAchievement: metrics.targetPieces ? Math.round((metrics.actualPieces / metrics.targetPieces) * 100) : 0,
    consumersAchievement: metrics.targetConsumers
      ? Math.round((metrics.totalConsumers / metrics.targetConsumers) * 100)
      : 0,
  };
}

function emptyMetrics(extra = {}) {
  return {
    ...extra,
    actualPieces: 0,
    targetPieces: 0,
    totalConsumers: 0,
    targetConsumers: 0,
    vouchers: 0,
    salesValue: 0,
    reports: 0,
  };
}

function sumMetrics(rows) {
  return withAchievement(rows.reduce((summary, row) => ({
    ...summary,
    actualPieces: summary.actualPieces + toNumber(row.actualPieces),
    targetPieces: summary.targetPieces + toNumber(row.targetPieces),
    totalConsumers: summary.totalConsumers + toNumber(row.totalConsumers),
    targetConsumers: summary.targetConsumers + toNumber(row.targetConsumers),
    vouchers: summary.vouchers + toNumber(row.vouchers),
    salesValue: summary.salesValue + toNumber(row.salesValue),
    reports: summary.reports + toNumber(row.reports),
  }), emptyMetrics()));
}

function buildCategoryRows(reports, targets, products) {
  const catalog = new Map(products.map((product) => [text(product.ProductID), product]));
  const productOrder = createProductOrder(products);
  const categories = new Map();

  function ensure(productId, fallback = {}) {
    const product = catalog.get(productId) || {};
    const category = text(product.Category) || text(fallback.Category) || text(fallback.CategoryName) || "منتجات أخرى";
    const productName = text(product.ProductName) || text(fallback.ProductName) || productId;
    const key = `${category}-${productId}`;
    if (!categories.has(category)) categories.set(category, { category, actualPieces: 0, targetPieces: 0, salesValue: 0, products: new Map() });
    const categoryRow = categories.get(category);
    if (!categoryRow.products.has(key)) categoryRow.products.set(key, { productId, productName, actualPieces: 0, targetPieces: 0, salesValue: 0 });
    return { categoryRow, product: categoryRow.products.get(key) };
  }

  targets.forEach((target) => {
    const productId = text(target.ProductID);
    if (!productId) return;
    const { categoryRow, product } = ensure(productId, target);
    const amount = toNumber(target.TargetPieces);
    categoryRow.targetPieces += amount;
    product.targetPieces += amount;
  });

  reports.forEach((report) => {
    const productId = text(report.ProductID);
    if (!productId) return;
    const { categoryRow, product } = ensure(productId, report);
    const amount = toNumber(report.ActualPieces);
    const salesValue = toNumber(report.SalesValue);
    categoryRow.actualPieces += amount;
    categoryRow.salesValue += salesValue;
    product.actualPieces += amount;
    product.salesValue += salesValue;
  });

  return [...categories.values()].map((category) => ({
    category: category.category,
    actualPieces: category.actualPieces,
    targetPieces: category.targetPieces,
    salesValue: category.salesValue,
    piecesAchievement: category.targetPieces ? Math.round((category.actualPieces / category.targetPieces) * 100) : 0,
    products: [...category.products.values()].map((product) => ({
      ...product,
      piecesAchievement: product.targetPieces ? Math.round((product.actualPieces / product.targetPieces) * 100) : 0,
    })).sort(productOrder.compareProducts),
  })).sort(productOrder.compareCategories);
}

function buildDelegateMetrics(delegates, reports, targets, supervisorAssignments) {
  const metrics = new Map(delegates.map((delegate) => [text(delegate.DelegateID), emptyMetrics({
    delegateId: text(delegate.DelegateID),
    delegateName: text(delegate.DelegateName) || text(delegate.Name),
    supervisorCode: supervisorAssignments.get(text(delegate.DelegateID)) || text(delegate.SupervisorCode),
  })]));
  const customerTargets = new Map();

  targets.forEach((target) => {
    const delegateId = text(target.DelegateID);
    const metric = metrics.get(delegateId);
    if (!metric) return;
    metric.targetPieces += toNumber(target.TargetPieces);
    const targetKey = `${delegateId}\u0000${toDate(target.Date) || rowMonth(target)}\u0000${branchKey(target)}`;
    customerTargets.set(targetKey, Math.max(customerTargets.get(targetKey) || 0, toNumber(target.TargetConsumer)));
  });

  customerTargets.forEach((target, key) => {
    const [delegateId] = key.split("\u0000");
    const metric = metrics.get(delegateId);
    if (metric) metric.targetConsumers += target;
  });

  const groupedReports = new Map();
  reports.forEach((report) => {
    const key = reportKey(report);
    groupedReports.set(key, [...(groupedReports.get(key) || []), report]);
  });
  groupedReports.forEach((rows) => {
    const delegateId = text(rows[0]?.DelegateID);
    const metric = metrics.get(delegateId);
    if (!metric) return;
    metric.reports += 1;
    rows.forEach((report) => {
      metric.actualPieces += toNumber(report.ActualPieces);
      metric.totalConsumers += toNumber(report.TotalConsumer);
      metric.salesValue += toNumber(report.SalesValue);
      if (text(report.ReportType) === "Vouchers") {
        metric.vouchers += toNumber(text(report.Vouchers) || report.Amount);
      }
    });
  });

  return [...metrics.values()].map(withAchievement);
}

function buildTeamDays(reports) {
  const days = new Map();

  reports.forEach((report) => {
    const date = toDate(report.Date);
    if (!date) return;
    const day = days.get(date) || {
      date,
      actualPieces: 0,
      totalConsumers: 0,
      vouchers: 0,
      salesValue: 0,
      reportKeys: new Set(),
    };
    day.actualPieces += toNumber(report.ActualPieces);
    day.totalConsumers += toNumber(report.TotalConsumer);
    day.salesValue += toNumber(report.SalesValue);
    if (text(report.ReportType) === "Vouchers") day.vouchers += toNumber(text(report.Vouchers) || report.Amount);
    day.reportKeys.add(reportKey(report));
    days.set(date, day);
  });

  return [...days.values()]
    .map(({ reportKeys, ...day }) => ({ ...day, reports: reportKeys.size }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function buildSupervisorAssignments(delegates, supervisors, reports) {
  const supervisorIds = new Map(supervisors.map((supervisor) => [key(supervisor.SupervisorsID), text(supervisor.SupervisorsID)]));
  const reportedAssignments = new Map();
  reports.forEach((report) => {
    const delegateId = text(report.DelegateID);
    const supervisorId = supervisorIds.get(key(report.SupervisorsID));
    if (!delegateId || !supervisorId) return;
    const counts = reportedAssignments.get(delegateId) || new Map();
    counts.set(supervisorId, (counts.get(supervisorId) || 0) + 1);
    reportedAssignments.set(delegateId, counts);
  });

  return new Map(delegates.map((delegate) => {
    const delegateId = text(delegate.DelegateID);
    const direct = supervisorIds.get(key(delegate.SupervisorCode));
    const reported = [...(reportedAssignments.get(delegateId) || new Map()).entries()]
      .sort((left, right) => right[1] - left[1])[0]?.[0];
    return [delegateId, direct || reported || text(delegate.SupervisorCode)];
  }));
}

function supervisorIdForUser(user, supervisors) {
  const candidates = [user?.supervisorId, user?.id].map(key).filter(Boolean);
  const supervisor = supervisors.find((row) => {
    const identifiers = [row.SupervisorsID, row.SupervisorID, row.ID, row.UUID].map(key);
    return candidates.some((candidate) => identifiers.includes(candidate));
  });

  return key(supervisor?.SupervisorsID || supervisor?.SupervisorID || supervisor?.ID) || candidates[0] || "";
}

function scopedDelegates(user, delegates, supervisorAssignments, reports, targets, supervisorId) {
  const role = canonicalRole(user.role);
  const knownDelegates = new Map(delegates.map((delegate) => [text(delegate.DelegateID), delegate]));
  const selected = new Map();

  function addDelegate(delegateId, fallback = {}) {
    const id = text(delegateId);
    if (!id || selected.has(id)) return;
    const existing = knownDelegates.get(id);
    selected.set(id, existing || {
      DelegateID: id,
      DelegateName: text(fallback.DelegateName),
      SupervisorCode: text(fallback.SupervisorCode || fallback.SupervisorsID),
    });
  }

  if (role === "Management") {
    delegates.forEach((delegate) => addDelegate(delegate.DelegateID, delegate));
    reports.forEach((report) => addDelegate(report.DelegateID, report));
    targets.forEach((target) => addDelegate(target.DelegateID, target));
    return [...selected.values()];
  }

  const resolvedSupervisorId = supervisorId || key(user.supervisorId);
  delegates
    .filter((delegate) => key(supervisorAssignments.get(text(delegate.DelegateID))) === resolvedSupervisorId)
    .forEach((delegate) => addDelegate(delegate.DelegateID, delegate));
  reports
    .filter((report) => key(report.SupervisorsID) === resolvedSupervisorId)
    .forEach((report) => addDelegate(report.DelegateID, report));
  return [...selected.values()];
}

function buildSupervisorRows(user, supervisors, delegateRows) {
  const role = canonicalRole(user.role);
  const definitions = role === "Management"
    ? supervisors.map((supervisor) => ({ supervisorId: text(supervisor.SupervisorsID), supervisorName: text(supervisor.SupervisorName) || text(supervisor.Name) }))
    : [{ supervisorId: text(user.supervisorId), supervisorName: text(user.name) }];
  const rows = definitions.map((supervisor) => {
    const team = delegateRows.filter((delegate) => key(delegate.supervisorCode) === key(supervisor.supervisorId));
    return withAchievement({
      supervisorId: supervisor.supervisorId,
      supervisorName: supervisor.supervisorName || "غير محدد",
      delegates: team.length,
      ...sumMetrics(team),
    });
  });

  if (role === "Management") {
    const assigned = new Set(definitions.map((supervisor) => supervisor.supervisorId));
    const unassigned = delegateRows.filter((delegate) => !assigned.has(delegate.supervisorCode));
    if (unassigned.length) rows.push(withAchievement({ supervisorId: "unassigned", supervisorName: "غير محدد", delegates: unassigned.length, ...sumMetrics(unassigned) }));
  }
  return rows.sort((left, right) => right.actualPieces - left.actualPieces || left.supervisorName.localeCompare(right.supervisorName, "ar"));
}

async function getOversightData(user, { month } = {}) {
  const selectedMonth = /^\d{4}-\d{2}$/.test(toMonth(month)) ? toMonth(month) : currentMonth();
  const [reportSheet, targetSheet, productSheet, delegateSheet, supervisorSheet, unitPriceSheet] = await Promise.all([
    getSheetRows("Reports"),
    getSheetRows("Targets"),
    getSheetRows("Products"),
    getSheetRows("Delegates"),
    getSheetRows("Supervisors"),
    getSheetRows(UNIT_PRICE_SHEET),
  ]);
  const supervisorAssignments = buildSupervisorAssignments(delegateSheet.rows, supervisorSheet.rows, reportSheet.rows);
  const role = canonicalRole(user.role);
  const supervisorId = supervisorIdForUser(user, supervisorSheet.rows);
  const team = scopedDelegates(user, delegateSheet.rows, supervisorAssignments, reportSheet.rows, targetSheet.rows, supervisorId);
  const teamIds = new Set(team.map((delegate) => text(delegate.DelegateID)));
  const reports = resolveReportsPricing(reportSheet.rows.filter((report) => rowMonth(report) === selectedMonth && (
    role === "Management" || teamIds.has(text(report.DelegateID)) || key(report.SupervisorsID) === supervisorId
  )), productSheet.rows, unitPriceSheet.rows);
  const targets = targetSheet.rows.filter((target) => teamIds.has(text(target.DelegateID)) && rowMonth(target) === selectedMonth);
  const delegates = buildDelegateMetrics(team, reports, targets, supervisorAssignments).sort((left, right) => right.actualPieces - left.actualPieces || left.delegateName.localeCompare(right.delegateName, "ar"));

  return {
    month: selectedMonth,
    scope: {
      role,
      name: text(user.name),
      delegates: delegates.length,
    },
    summary: sumMetrics(delegates),
    supervisors: buildSupervisorRows(user, supervisorSheet.rows, delegates),
    delegates,
    categories: buildCategoryRows(reports, targets, productSheet.rows),
    teamDays: buildTeamDays(reports),
  };
}

async function getDelegateDrilldown(user, { delegateId, month } = {}) {
  const selectedMonth = /^\d{4}-\d{2}$/.test(toMonth(month)) ? toMonth(month) : currentMonth();
  const requestedDelegateId = text(delegateId);
  const [reportSheet, targetSheet, productSheet, delegateSheet, supervisorSheet, unitPriceSheet] = await Promise.all([
    getSheetRows("Reports"),
    getSheetRows("Targets"),
    getSheetRows("Products"),
    getSheetRows("Delegates"),
    getSheetRows("Supervisors"),
    getSheetRows(UNIT_PRICE_SHEET),
  ]);
  const supervisorAssignments = buildSupervisorAssignments(delegateSheet.rows, supervisorSheet.rows, reportSheet.rows);
  const supervisorId = supervisorIdForUser(user, supervisorSheet.rows);
  const allowedDelegates = scopedDelegates(user, delegateSheet.rows, supervisorAssignments, reportSheet.rows, targetSheet.rows, supervisorId);
  const delegate = allowedDelegates.find((item) => key(item.DelegateID) === key(requestedDelegateId));
  if (!delegate) {
    const error = new Error("You do not have permission to view this delegate");
    error.statusCode = 403;
    throw error;
  }

  const reports = resolveReportsPricing(reportSheet.rows.filter((report) => key(report.DelegateID) === key(delegate.DelegateID) && rowMonth(report) === selectedMonth), productSheet.rows, unitPriceSheet.rows);
  const targets = targetSheet.rows.filter((target) => key(target.DelegateID) === key(delegate.DelegateID) && rowMonth(target) === selectedMonth);
  const summary = buildMonthlyAggregate(reports, targets, productSheet.rows, delegate.DelegateID, selectedMonth);
  const days = [...new Set(reports.map((report) => toDate(report.Date)).filter(Boolean))]
    .sort((left, right) => right.localeCompare(left))
    .map((date) => {
      const dayReports = reports.filter((report) => toDate(report.Date) === date);
      const dayTargets = targets.filter((target) => toDate(target.Date) === date);
      return { date, ...buildMonthlyAggregate(dayReports, dayTargets, productSheet.rows, delegate.DelegateID, selectedMonth) };
    });

  return {
    month: selectedMonth,
    delegate: {
      delegateId: text(delegate.DelegateID),
      delegateName: text(delegate.DelegateName) || text(delegate.Name),
    },
    summary,
    days,
  };
}

module.exports = { getOversightData, getDelegateDrilldown };
