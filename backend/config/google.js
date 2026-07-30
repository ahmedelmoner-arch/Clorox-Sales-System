const { google } = require("googleapis");
const { GOOGLE_SERVICE_ACCOUNT, GOOGLE_SERVICE_ACCOUNT_JSON } = require("./env");

function serviceAccountCredentials() {
  const value = String(GOOGLE_SERVICE_ACCOUNT_JSON || "").trim();
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON");
  }
}

const credentials = serviceAccountCredentials();

const auth = new google.auth.GoogleAuth({
  ...(credentials ? { credentials } : { keyFile: GOOGLE_SERVICE_ACCOUNT }),
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
  ],
});

const sheets = google.sheets({
  version: "v4",
  auth,
});

const drive = google.drive({
  version: "v3",
  auth,
});

module.exports = {
  auth,
  sheets,
  drive,
};
