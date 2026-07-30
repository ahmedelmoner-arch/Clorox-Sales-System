require("dotenv").config();
const { randomBytes } = require("crypto");

const isProduction = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET || (isProduction ? "" : randomBytes(48).toString("hex"));

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required when NODE_ENV is production");
}

if (!process.env.JWT_SECRET && !isProduction) {
  console.warn("JWT_SECRET is not set; using a temporary development secret that resets when the server restarts.");
}

module.exports = {
  PORT: process.env.PORT || 5050,

  GOOGLE_SERVICE_ACCOUNT:
    process.env.GOOGLE_SERVICE_ACCOUNT,

  GOOGLE_SERVICE_ACCOUNT_JSON:
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON,

  SPREADSHEET_ID:
    process.env.SPREADSHEET_ID,

  JWT_SECRET: jwtSecret,

  NODE_ENV:
    process.env.NODE_ENV || "development",
};
