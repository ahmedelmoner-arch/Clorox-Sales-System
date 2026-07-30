const aliases = new Map([
  ["sales", "Sales"],
  ["مبيعات", "Sales"],
  ["vouchers", "Vouchers"],
  ["voucher", "Vouchers"],
  ["فاوتشر", "Vouchers"],
  ["إجازة", "Vacation"],
  ["اجازة", "Vacation"],
  ["vacation", "Vacation"],
]);

function canonicalReportType(value) {
  return aliases.get(String(value ?? "").trim().toLowerCase()) || null;
}

module.exports = { canonicalReportType };
