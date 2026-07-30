const ROLE_ALIASES = new Map([
  ["delegate", "Delegate"],
  ["sales representative", "Delegate"],
  ["مندوبة", "Delegate"],
  ["supervisor", "Supervisor"],
  ["supervisors", "Supervisor"],
  ["مشرف", "Supervisor"],
  ["management", "Management"],
  ["manegments", "Management"],
  ["manager", "Management"],
  ["admin", "Management"],
  ["administrator", "Management"],
  ["إدارة", "Management"],
]);

function canonicalRole(value, fallback = "") {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ROLE_ALIASES.get(normalized) || fallback;
}

module.exports = { canonicalRole };
