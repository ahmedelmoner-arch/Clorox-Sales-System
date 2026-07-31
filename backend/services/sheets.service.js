const { sheets } = require("../config/google");
const { SPREADSHEET_ID } = require("../config/env");

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

async function getSheetRows(sheetName) {
  requireSpreadsheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  });
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

  return {
    headers,
    rows,
    rowNumbers,
  };
}

async function appendSheetRows(sheetName, headers, records) {
  requireSpreadsheetId();
  if (!records.length) return;

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: records.map((record) => headers.map((header) => record[header] ?? "")),
    },
  });

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
    range: `${sheetName}!A${rowNumber}:Z${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [headers.map((header) => record[header] ?? "")],
    },
  });

  return {
    updatedRange: response.data.updatedRange || "",
    updatedRows: response.data.updatedRows || 1,
  };
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

module.exports = { appendSheetRows, currentDate, currentMonth, getSheetRows, toDate, toMonth, toNumber, updateSheetRow };
