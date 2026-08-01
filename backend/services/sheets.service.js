const { sheets } = require("../config/google");
const { SPREADSHEET_ID } = require("../config/env");

const CACHE_TTL_MS = 5000;
const sheetRowsCache = new Map();
const sheetTitlesCache = { expiresAt: 0, value: null };

function invalidateSheetCache(sheetName) {
  sheetRowsCache.delete(sheetName);
  sheetTitlesCache.expiresAt = 0;
  sheetTitlesCache.value = null;
}

function requireSpreadsheetId() {
  if (!SPREADSHEET_ID) {
    const error = new Error("SPREADSHEET_ID is missing. Add it to Vercel Environment Variables or backend/.env.");
    error.statusCode = 503;
    throw error;
  }
}

function asRecord(headers, row) {
  return headers.reduce((record, header, index) => {
    record[header] = row[index] ?? "";
    return record;
  }, {});
}

function columnLetter(columnNumber) {
  let value = Number(columnNumber);
  let label = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label || "A";
}

async function contiguousTableEndRow(sheetName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
  });
  const values = response.data.values || [];

  // Column A is the report UUID. The first empty UUID ends the actual Reports
  // table, even if a previous append accidentally created data much lower in
  // the sheet or the grid has preformatted empty rows.
  const firstEmptyRecord = values.slice(1).findIndex((row) => !String(row?.[0] ?? "").trim());
  return firstEmptyRecord === -1 ? Math.max(values.length, 1) : firstEmptyRecord + 1;
}

async function getSheetRows(sheetName) {
  requireSpreadsheetId();

  const cached = sheetRowsCache.get(sheetName);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const request = sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    // Reports now includes audit fields after the original columns. Keep the
    // read range wider so those fields remain available when the row is edited.
    range: `${sheetName}!A:AZ`,
  }).then((response) => {
    const values = response.data.values || [];
    if (!values.length) return { headers: [], rows: [], rowNumbers: [] };

    const headers = values[0];
    const rows = [];
    const rowNumbers = [];
    values.slice(1).forEach((row, index) => {
      if (!row.some((value) => value !== "")) return;
      rows.push(asRecord(headers, row));
      rowNumbers.push(index + 2);
    });

    return { headers, rows, rowNumbers };
  });

  sheetRowsCache.set(sheetName, { expiresAt: Date.now() + CACHE_TTL_MS, value: request });
  try {
    const value = await request;
    sheetRowsCache.set(sheetName, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    return value;
  } catch (error) {
    sheetRowsCache.delete(sheetName);
    throw error;
  }
}

async function getSheetTitles() {
  requireSpreadsheetId();
  if (sheetTitlesCache.value && sheetTitlesCache.expiresAt > Date.now()) return sheetTitlesCache.value;
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: "sheets.properties.title",
  });
  const titles = new Set((response.data.sheets || []).map((sheet) => sheet.properties?.title).filter(Boolean));
  sheetTitlesCache.value = titles;
  sheetTitlesCache.expiresAt = Date.now() + CACHE_TTL_MS;
  return titles;
}

async function ensureSheetExists(sheetName) {
  const titles = await getSheetTitles();
  if (titles.has(sheetName)) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    },
  });
  invalidateSheetCache(sheetName);
}

async function getSheetRowsIfExists(sheetName) {
  const titles = await getSheetTitles();
  if (!titles.has(sheetName)) return { headers: [], rows: [], rowNumbers: [] };
  return getSheetRows(sheetName);
}

async function appendSheetRows(sheetName, headers, records) {
  requireSpreadsheetId();
  if (!records.length) return;

  const tableEndRow = await contiguousTableEndRow(sheetName);
  const tableRange = `${sheetName}!A1:${columnLetter(headers.length)}${tableEndRow}`;

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    // Give Google the exact contiguous table, not the whole column. This makes
    // the new records land immediately below the final report row.
    range: tableRange,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: records.map((record) => headers.map((header) => record[header] ?? "")),
    },
  });
  invalidateSheetCache(sheetName);

  return {
    updatedRange: response.data.updates?.updatedRange || "",
    updatedRows: response.data.updates?.updatedRows || records.length,
  };
}

async function updateSheetRow(sheetName, headers, rowNumber, record) {
  requireSpreadsheetId();
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new Error("A valid Google Sheet row number is required");
  }

  const response = await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowNumber}:${columnLetter(headers.length)}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [headers.map((header) => record[header] ?? "")],
    },
  });
  invalidateSheetCache(sheetName);

  return {
    updatedRange: response.data.updatedRange || "",
    updatedRows: response.data.updatedRows || 1,
  };
}

async function ensureSheetHeaders(sheetName, requiredHeaders) {
  await ensureSheetExists(sheetName);
  const { headers } = await getSheetRows(sheetName);
  const additions = requiredHeaders.filter((header) => !headers.includes(header));
  if (!additions.length) return headers;

  const updatedHeaders = [...headers, ...additions];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:${columnLetter(updatedHeaders.length)}1`,
    valueInputOption: "RAW",
    requestBody: { values: [updatedHeaders] },
  });
  invalidateSheetCache(sheetName);

  return updatedHeaders;
}

function toNumber(value) {
  const result = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(result) ? result : 0;
}

function toDate(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

  const slashDate = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (slashDate) {
    const [, first, second, year] = slashDate;
    const dayFirst = Number(first) > 12 || (Number(second) <= 12 && Number(first) <= 12);
    const day = dayFirst ? first : second;
    const month = dayFirst ? second : first;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  return text;
}

function toMonth(value) {
  const date = toDate(value);
  return /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : date;
}

function currentDate() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date()).reduce((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function currentMonth() {
  return currentDate().slice(0, 7);
}

module.exports = {
  appendSheetRows,
  currentDate,
  currentMonth,
  ensureSheetHeaders,
  getSheetRows,
  getSheetRowsIfExists,
  toDate,
  toMonth,
  toNumber,
  updateSheetRow,
};
