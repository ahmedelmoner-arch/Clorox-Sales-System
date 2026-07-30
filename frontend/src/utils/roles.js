const aliases = {
  delegate: "Delegate",
  "sales representative": "Delegate",
  supervisor: "Supervisor",
  supervisors: "Supervisor",
  management: "Management",
  manegments: "Management",
  manager: "Management",
  admin: "Management",
  administrator: "Management",
};

export function normalizeRole(value, fallback = "Delegate") {
  return aliases[String(value || "").trim().toLowerCase()] || fallback;
}

export function roleHome(role) {
  return normalizeRole(role) === "Delegate" ? "/dashboard" : "/oversight";
}

export function roleLabel(role) {
  const labels = { Delegate: "مندوبة مبيعات", Supervisor: "مشرف", Management: "الإدارة" };
  return labels[normalizeRole(role)] || "مستخدم";
}

export function isOversightRole(role) {
  return ["Supervisor", "Management"].includes(normalizeRole(role));
}
