const branchService = require("./branch.service");
const productService = require("./product.service");
const { currentDate, getSheetRows, toDate, toMonth, toNumber } = require("./sheets.service");
const { buildProductNameToIdMap, getTargetRowProductTargets, matchesDelegateRow } = require("./target.service");
const { canonicalReportType } = require("../utils/report-types");
const { UNIT_PRICE_SHEET, addMonthlyUnitPrices, priceMonthColumn } = require("./unit-price.service");

function normalizeTargetValue(value) {
  return String(value ?? "").trim();
}

function matchesTargetBranch(target, branch) {
  const branchName = normalizeTargetValue(branch?.BranchName || branch?.name);
  const targetBranchName = normalizeTargetValue(target.BranchName);
  if (branchName && targetBranchName) return branchName === targetBranchName;

  const branchId = normalizeTargetValue(branch?.BranchID || branch?.code);
  const targetBranchId = normalizeTargetValue(target.BranchID);
  if (branchId && targetBranchId) return branchId === targetBranchId;

  return false;
}

function targetBranchKey(target) {
  return normalizeTargetValue(target.BranchName) || normalizeTargetValue(target.BranchID);
}

async function getInitData(user, { date, branchId, branchName } = {}) {
  const [branches, products, reportTypesResult, vacationTypesResult, targetsResult, supervisorsResult, unitPriceResult] = await Promise.all([
    branchService.getBranches(),
    productService.getAll(),
    getSheetRows("ReportTypes"),
    getSheetRows("VacationType"),
    getSheetRows("Targets"),
    getSheetRows("Supervisors"),
    getSheetRows(UNIT_PRICE_SHEET),
  ]);

  const reportTypes = [
    "مبيعات",
    "إجازة",
    "اجتماع",
  ];

  const delegateId = String(user.delegateId || user.id || "");
  const selectedDate = toDate(date) || currentDate();
  const selectedBranch = { BranchID: branchId, BranchName: branchName };
  const hasSelectedBranch = Boolean(normalizeTargetValue(branchId) || normalizeTargetValue(branchName));
  const productNameToId = buildProductNameToIdMap(products);
  const customerTargetsByBranch = new Map();
  const productTargets = targetsResult.rows.reduce((result, target) => {
    const sameDelegate = matchesDelegateRow(target, user);
    const dateValue = toDate(target.Date);
    const sameDate = dateValue ? dateValue === selectedDate : toMonth(target.Month) === toMonth(selectedDate);
    if (!sameDelegate || !sameDate) return result;
    if (hasSelectedBranch && !matchesTargetBranch(target, selectedBranch)) return result;

    const branchKey = targetBranchKey(target);
    customerTargetsByBranch.set(branchKey, Math.max(customerTargetsByBranch.get(branchKey) || 0, toNumber(target.TargetConsumer)));

    const rowProductTargets = getTargetRowProductTargets(target, productNameToId);
    rowProductTargets.forEach((amount, productId) => {
      const previous = result[productId] || { targetPieces: 0 };
      result[productId] = {
        targetPieces: previous.targetPieces + amount,
      };
    });
    return result;
  }, {});

  return {
    today: currentDate(),

    delegate: {
      id: user.id,
      code: user.delegateId,
      name: user.name,
    },

    reportTypes: [...new Set(reportTypesResult.rows.map((item) => canonicalReportType(item.ReportTypes)).filter(Boolean))],
    vacationTypes: vacationTypesResult.rows.map((item) => item.VacationType).filter(Boolean),
    supervisors: supervisorsResult.rows
      .map((item) => ({ id: item.SupervisorsID || "", name: item.SupervisorName || "" }))
      .filter((supervisor) => supervisor.id && supervisor.name)
      .sort((left, right) => left.name.localeCompare(right.name, "ar")),
    branches,
    products: addMonthlyUnitPrices(products, unitPriceResult.rows, selectedDate),
    unitPriceMonth: priceMonthColumn(selectedDate),
    productTargets,
    targetConsumers: [...customerTargetsByBranch.values()].reduce((total, value) => total + value, 0),
    targetDate: selectedDate,
  };
}

module.exports = {
  getInitData,
};
