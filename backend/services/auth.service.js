const { getSheetRows, updateSheetRow } = require("./sheets.service");
const { generateToken } = require("../utils/jwt");
const { canonicalRole } = require("../utils/roles");
const bcrypt = require("bcrypt");

function normalize(value) {
  return String(value ?? "").trim();
}

function normalizeDelegateCode(value) {
  return normalize(value).toUpperCase();
}

const ACCOUNT_CONFIG = {
  Delegate: {
    sheets: ["Delegates"],
    codeFields: ["DelegateID"],
    nameFields: ["DelegateName", "Name"],
  },
  Supervisor: {
    sheets: ["Supervisors"],
    codeFields: ["SupervisorsID", "SupervisorID", "ID"],
    nameFields: ["SupervisorName", "Name"],
  },
  Management: {
    sheets: ["Manegments", "Managements", "Admins", "Administration"],
    codeFields: ["ID", "ManagementID", "AdminID"],
    nameFields: ["Name", "ManagementName", "AdminName"],
  },
};

const SECRET_FIELDS = ["SecretCode", "Secret", "Password", "PasswordHash"];

function firstValue(row, fields) {
  const field = fields.find((name) => Object.prototype.hasOwnProperty.call(row, name));
  return field ? row[field] : "";
}

function firstField(row, fields) {
  return fields.find((name) => Object.prototype.hasOwnProperty.call(row, name)) || "";
}

function hasCredentialColumn(headers) {
  return headers.some((header) => SECRET_FIELDS.includes(String(header || "").trim()));
}

function configurationError(message) {
  const error = new Error(message);
  error.statusCode = 503;
  return error;
}

async function readAccountSheet(config) {
  let lastError;
  for (const sheetName of config.sheets) {
    try {
      return { ...(await getSheetRows(sheetName)), sheetName };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || configurationError("Account sheet is not available");
}

async function secretMatches(storedSecret, secretCode) {
  const secret = normalize(storedSecret);
  if (!secret) return false;
  return secret.startsWith("$2")
    ? bcrypt.compare(String(secretCode ?? ""), secret)
    : secret === normalize(secretCode);
}

async function loginUser({ role, code, secretCode }) {
  const accountRole = role === undefined || role === null || !String(role).trim()
    ? "Delegate"
    : canonicalRole(role, "");
  const config = ACCOUNT_CONFIG[accountRole];
  if (!config) return { success: false, message: "Invalid account type" };

  const { headers, rows, sheetName } = await readAccountSheet(config);
  if (!hasCredentialColumn(headers)) {
    throw configurationError(`يجب إضافة عمود SecretCode في شيت ${sheetName} قبل تسجيل دخول هذا الدور`);
  }

  let account = null;
  let accountIndex = -1;
  let secretField = "";
  for (const [index, row] of rows.entries()) {
    if (normalizeDelegateCode(firstValue(row, config.codeFields)) !== normalizeDelegateCode(code)) continue;
    const candidateSecretField = firstField(row, SECRET_FIELDS);
    if (await secretMatches(row[candidateSecretField], secretCode)) {
      account = row;
      accountIndex = index;
      secretField = candidateSecretField;
      break;
    }
  }

  if (!account) {
    return { success: false, message: "Invalid access code or secret code" };
  }

  const storedSecret = normalize(account[secretField]);
  if (secretField && storedSecret && !storedSecret.startsWith("$2")) {
    try {
      await updateSheetRow(sheetName, headers, rowNumbers[accountIndex], {
        ...account,
        [secretField]: await bcrypt.hash(String(secretCode ?? ""), 12),
      });
    } catch (error) {
      console.warn(`Could not upgrade the secret hash for ${sheetName}.`, error.message);
    }
  }

  const accountId = firstValue(account, config.codeFields);
  const name = firstValue(account, config.nameFields);
  const user = {
    id: account.UUID || accountId,
    role: accountRole,
    name,
  };
  if (accountRole === "Delegate") {
    user.delegateId = accountId;
    user.delegateName = name;
    user.supervisorCode = account.SupervisorCode || "";
    user.avatarUrl = account.ProfileImage || "";
  }
  if (accountRole === "Supervisor") user.supervisorId = accountId;
  if (accountRole === "Management") user.managementId = accountId;

  return {
    success: true,
    message: "Login Successful",
    user,
    token: generateToken(user),
  };
}

async function loginDelegate(delegateCode, secretCode) {
  return loginUser({ role: "Delegate", code: delegateCode, secretCode });
}

module.exports = {
  loginUser,
  loginDelegate,
};
