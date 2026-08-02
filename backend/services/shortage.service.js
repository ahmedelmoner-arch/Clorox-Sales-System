const { randomUUID } = require("crypto");
const { canonicalRole } = require("../utils/roles");
const {
  appendSheetRows,
  ensureSheetHeaders,
  getSheetRows,
  getSheetRowsIfExists,
  toDate,
  toMonth,
  toNumber,
  updateSheetRow,
} = require("./sheets.service");

const SHORTAGE_SHEET = "ProductShortages";
const SHORTAGE_HEADERS = [
  "ShortageID",
  "VisitID",
  "ReportID",
  "Month",
  "Date",
  "DelegateID",
  "DelegateName",
  "SupervisorsID",
  "SupervisorName",
  "BranchID",
  "BranchName",
  "ProductID",
  "ProductName",
  "Category",
  "ShortageType",
  "EstimatedDemand",
  "Notes",
  "Status",
  "CreatedAt",
  "ResolvedAt",
  "ResolvedBy",
];
const SHORTAGE_TYPES = new Set(["OutOfStock", "LowStock", "NotDisplayed"]);
const SHORTAGE_STATUSES = new Set(["Open", "Resolved"]);

function text(value, maximumLength = 500) {
  return String(value ?? "").trim().slice(0, maximumLength);
}

function key(value) {
  return text(value, 100).toUpperCase();
}

function matchesDelegate(row, delegateId) {
  return text(row.DelegateID, 100) === text(delegateId, 100);
}

function requireDate(value) {
  const date = toDate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Shortage date must be in YYYY-MM-DD format");
  return date;
}

function optionalNonNegativeInteger(value, fieldName) {
  if (text(value, 50) === "") return "";
  const amount = Number(value);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
    throw new Error(`${fieldName} must be a non-negative whole number`);
  }
  return amount;
}

function rowMonth(row) {
  const month = toMonth(row.Month);
  return /^\d{4}-\d{2}$/.test(month) ? month : toMonth(row.Date);
}

function dayLabel(date) {
  return toDate(date).slice(-2) || "-";
}

function normalizeStatus(value) {
  return SHORTAGE_STATUSES.has(text(value, 50)) ? text(value, 50) : "Open";
}

function buildShortageAnalytics(rows, { month, date } = {}) {
  const selectedMonth = /^\d{4}-\d{2}$/.test(toMonth(month)) ? toMonth(month) : "";
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(toDate(date)) ? toDate(date) : "";
  const filtered = rows
    .filter((row) => !selectedMonth || rowMonth(row) === selectedMonth)
    .filter((row) => !selectedDate || toDate(row.Date) === selectedDate)
    .map((row) => ({
      ...row,
      Date: toDate(row.Date),
      EstimatedDemand: toNumber(row.EstimatedDemand),
      Status: normalizeStatus(row.Status),
    }));
  const productTotals = new Map();
  const branchTotals = new Map();
  const dailyTotals = new Map();
  const typeTotals = new Map();

  filtered.forEach((row) => {
    const status = normalizeStatus(row.Status);
    const productId = text(row.ProductID, 100) || text(row.ProductName, 200) || "unknown-product";
    const branch = text(row.BranchName, 200) || text(row.BranchID, 100) || "غير محدد";
    const date = toDate(row.Date) || "غير محدد";
    const type = SHORTAGE_TYPES.has(text(row.ShortageType, 50)) ? text(row.ShortageType, 50) : "OutOfStock";
    const product = productTotals.get(productId) || {
      productId,
      productName: text(row.ProductName, 200) || productId,
      category: text(row.Category, 200) || "منتجات أخرى",
      total: 0,
      open: 0,
      resolved: 0,
      estimatedDemand: 0,
    };
    const branchRow = branchTotals.get(branch) || { branch, total: 0, open: 0, resolved: 0 };
    const day = dailyTotals.get(date) || { date, label: dayLabel(date), total: 0, open: 0, resolved: 0 };
    const typeRow = typeTotals.get(type) || { type, total: 0 };

    product.total += 1;
    product.estimatedDemand += toNumber(row.EstimatedDemand);
    branchRow.total += 1;
    day.total += 1;
    typeRow.total += 1;
    if (status === "Resolved") {
      product.resolved += 1;
      branchRow.resolved += 1;
      day.resolved += 1;
    } else {
      product.open += 1;
      branchRow.open += 1;
      day.open += 1;
    }

    productTotals.set(productId, product);
    branchTotals.set(branch, branchRow);
    dailyTotals.set(date, day);
    typeTotals.set(type, typeRow);
  });

  const details = [...filtered].sort((left, right) => {
    const rightDate = `${toDate(right.Date)}-${text(right.CreatedAt, 40)}`;
    const leftDate = `${toDate(left.Date)}-${text(left.CreatedAt, 40)}`;
    return rightDate.localeCompare(leftDate);
  });
  const total = filtered.length;
  const resolved = filtered.filter((row) => row.Status === "Resolved").length;

  return {
    month: selectedMonth || "all",
    date: selectedDate,
    total,
    open: total - resolved,
    resolved,
    estimatedDemand: filtered.reduce((sum, row) => sum + toNumber(row.EstimatedDemand), 0),
    products: [...productTotals.values()].sort((left, right) => right.total - left.total || left.productName.localeCompare(right.productName, "ar")),
    branches: [...branchTotals.values()].sort((left, right) => right.total - left.total || left.branch.localeCompare(right.branch, "ar")),
    days: [...dailyTotals.values()].filter((row) => row.date !== "غير محدد").sort((left, right) => left.date.localeCompare(right.date)),
    types: [...typeTotals.values()].sort((left, right) => right.total - left.total),
    details,
  };
}

async function getShortageAnalytics(user, { month, date } = {}) {
  const sheet = await getSheetRowsIfExists(SHORTAGE_SHEET);
  const delegateId = user.delegateId || user.id;
  return buildShortageAnalytics(sheet.rows.filter((row) => matchesDelegate(row, delegateId)), { month, date });
}

async function getShortageAnalyticsForDelegateIds(delegateIds, { month, date } = {}) {
  const allowedIds = new Set([...delegateIds].map((delegateId) => text(delegateId, 100)).filter(Boolean));
  const sheet = await getSheetRowsIfExists(SHORTAGE_SHEET);
  return buildShortageAnalytics(sheet.rows.filter((row) => allowedIds.has(text(row.DelegateID, 100))), { month, date });
}

async function createShortages(user, payload = {}) {
  const date = requireDate(payload.date);
  const [branchSheet, productSheet, supervisorSheet, existingShortageSheet] = await Promise.all([
    getSheetRows("Branches"),
    getSheetRows("Products"),
    getSheetRows("Supervisors"),
    getSheetRowsIfExists(SHORTAGE_SHEET),
  ]);
  const branchId = text(payload.branchId, 100);
  const branchName = text(payload.branchName, 200);
  const branch = branchSheet.rows.find((row) => text(row.BranchID, 100) === branchId)
    || branchSheet.rows.find((row) => text(row.BranchName, 200) === branchName);
  if (!branch) throw new Error("Choose a valid branch");

  const supervisorId = text(payload.supervisorId, 100);
  const supervisor = supervisorSheet.rows.find((row) => text(row.SupervisorsID, 100) === supervisorId);
  if (!supervisor) throw new Error("Choose a valid supervisor");

  const products = new Map(productSheet.rows.map((product) => [text(product.ProductID, 100), product]));
  const submitted = Array.isArray(payload.shortages) ? payload.shortages : [];
  if (!submitted.length) throw new Error("Add at least one product shortage");

  const visitId = text(payload.reportId, 100) || randomUUID();
  const existingRowsById = new Map(existingShortageSheet.rows.map((row) => [text(row.ShortageID, 100), row]).filter(([id]) => id));
  const seenProducts = new Set();
  const seenShortageIds = new Set();
  const records = submitted.map((item) => {
    const shortageId = text(item?.shortageId, 100) || randomUUID();
    if (seenShortageIds.has(shortageId)) throw new Error("A shortage can only be submitted once per request");
    seenShortageIds.add(shortageId);
    const existing = existingRowsById.get(shortageId);
    if (existing && !matchesDelegate(existing, user.delegateId || user.id)) {
      throw new Error("This shortage identifier is already in use");
    }
    const productId = text(item?.productId, 100);
    const product = products.get(productId);
    if (!product) throw new Error("One or more shortage products are invalid");
    if (seenProducts.has(productId)) throw new Error("A product can only be added once per shortage record");
    seenProducts.add(productId);
    const shortageType = text(item?.shortageType, 50);
    if (!SHORTAGE_TYPES.has(shortageType)) throw new Error("Choose a valid shortage type");

    return {
      ShortageID: shortageId,
      VisitID: visitId,
      ReportID: text(payload.reportId, 100),
      Month: toMonth(date),
      Date: date,
      DelegateID: text(user.delegateId || user.id, 100),
      DelegateName: text(user.name || user.delegateName, 200),
      SupervisorsID: text(supervisor.SupervisorsID, 100),
      SupervisorName: text(supervisor.SupervisorName, 200),
      BranchID: text(branch.BranchID, 100),
      BranchName: text(branch.BranchName, 200),
      ProductID: text(product.ProductID, 100),
      ProductName: text(product.ProductName, 200),
      Category: text(product.Category, 200),
      ShortageType: shortageType,
      EstimatedDemand: optionalNonNegativeInteger(item?.estimatedDemand, "Estimated demand"),
      Notes: text(item?.notes, 500),
      Status: "Open",
      CreatedAt: new Date().toISOString(),
      ResolvedAt: "",
      ResolvedBy: "",
    };
  });

  const recordsToSave = records.filter((record) => !existingRowsById.has(record.ShortageID));
  const sheetUpdate = recordsToSave.length
    ? await appendSheetRows(SHORTAGE_SHEET, await ensureSheetHeaders(SHORTAGE_SHEET, SHORTAGE_HEADERS), recordsToSave)
    : { updatedRows: 0, updatedRange: "" };
  return {
    records: records.map((record) => existingRowsById.get(record.ShortageID) || record),
    sheetUpdate,
    alreadySaved: recordsToSave.length === 0,
  };
}

async function updateShortageStatus(user, shortageId, status) {
  const normalizedId = text(shortageId, 100);
  const normalizedStatus = text(status, 50);
  if (!SHORTAGE_STATUSES.has(normalizedStatus)) throw new Error("Choose a valid shortage status");

  const sheet = await getSheetRowsIfExists(SHORTAGE_SHEET);
  const rowIndex = sheet.rows.findIndex((row) => text(row.ShortageID, 100) === normalizedId);
  if (rowIndex < 0) {
    const error = new Error("Shortage record not found");
    error.statusCode = 404;
    throw error;
  }
  if (canonicalRole(user.role) === "Supervisor") {
    const supervisorSheet = await getSheetRows("Supervisors");
    const userIdentifiers = [user.supervisorId, user.id].map(key).filter(Boolean);
    const supervisor = supervisorSheet.rows.find((row) => {
      const rowIdentifiers = [row.SupervisorsID, row.SupervisorID, row.ID, row.UUID].map(key);
      return userIdentifiers.some((identifier) => rowIdentifiers.includes(identifier));
    });
    const supervisorId = key(supervisor?.SupervisorsID || supervisor?.SupervisorID || supervisor?.ID || user.supervisorId);
    if (!supervisorId || key(sheet.rows[rowIndex].SupervisorsID) !== supervisorId) {
      const error = new Error("You do not have permission to update this shortage");
      error.statusCode = 403;
      throw error;
    }
  }
  const headers = await ensureSheetHeaders(SHORTAGE_SHEET, SHORTAGE_HEADERS);
  const now = new Date().toISOString();
  const record = {
    ...sheet.rows[rowIndex],
    Status: normalizedStatus,
    ResolvedAt: normalizedStatus === "Resolved" ? now : "",
    ResolvedBy: normalizedStatus === "Resolved" ? [text(user.name || user.delegateName, 200), text(user.id || user.delegateId, 100)].filter(Boolean).join(" - ") : "",
  };
  const sheetUpdate = await updateSheetRow(SHORTAGE_SHEET, headers, sheet.rowNumbers[rowIndex], record);
  return { record, sheetUpdate };
}

module.exports = {
  SHORTAGE_SHEET,
  buildShortageAnalytics,
  createShortages,
  getShortageAnalytics,
  getShortageAnalyticsForDelegateIds,
  updateShortageStatus,
};
