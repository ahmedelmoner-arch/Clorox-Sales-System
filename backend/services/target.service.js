const { toDate, toMonth, toNumber } = require("./sheets.service");

const KNOWN_TARGET_ROW_FIELDS = new Set([
  "uuid",
  "aug",
  "month",
  "date",
  "delegateid",
  "delegate id",
  "delegate",
  "delegatename",
  "delegate name",
  "branchid",
  "branch id",
  "branch",
  "branchname",
  "branch name",
  "targetconsumer",
  "target consumer",
  "targetpieces",
  "target pieces",
  "target_pieces",
  "productid",
  "product id",
  "productname",
  "product name",
  "product_id",
  "product_name",
  "branch_id",
  "branch_name",
  "delegate_id",
  "delegate_name",
]);

const MONTH_NAMES = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

function normalizeProductName(value) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, ""); // remove diacritics

  // keep letters (including Arabic), numbers and spaces. Replace other
  // punctuation with spaces and collapse multiple spaces.
  let cleaned = text.replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
  // ensure letters and numbers are separated so 'pack10' -> 'pack 10'
  cleaned = cleaned.replace(/(\p{L})(\p{N})/gu, "$1 $2").replace(/(\p{N})(\p{L})/gu, "$1 $2");
  return cleaned;
}

function normalizeFieldName(value) {
  return normalizeProductName(value);
}

function buildProductNameToIdMap(products = []) {
  const map = new Map();
  const categoryFirst = new Map();
  products.forEach((product) => {
    const name = String(product?.ProductName || "").trim();
    const id = String(product?.ProductID || "").trim();
    if (!name || !id) return;

    const normalizedName = normalizeProductName(name);
    if (!map.has(normalizedName)) map.set(normalizedName, id);
    if (!map.has(name)) map.set(name, id);
    map.set(name.toLowerCase(), id);

    // Also map the product ID/code to itself so Targets headers that are
    // product codes (ProductID) will be matched directly.
    const idKey = String(id || "").trim();
    if (idKey) {
      map.set(idKey, id);
      map.set(idKey.toLowerCase(), id);
      map.set(normalizeProductName(idKey), id);
    }

    const category = String(product?.Category || "").trim();
    if (category && !categoryFirst.has(category.toLowerCase())) {
      categoryFirst.set(category.toLowerCase(), id);
    }

    const aliasFields = [product?.ProductCode, product?.Code, product?.SKU, product?.BarCode];
    aliasFields.forEach((alias) => {
      const aliasKey = String(alias || "").trim();
      if (!aliasKey) return;
      map.set(aliasKey, id);
      map.set(aliasKey.toLowerCase(), id);
      map.set(normalizeProductName(aliasKey), id);
    });
  });

  // Also map normalized category names to the first product id seen for that
  // category as a fallback for Targets headers that use category labels.
  for (const [catLower, id] of categoryFirst.entries()) {
    const key = normalizeProductName(catLower);
    if (!map.has(key)) map.set(key, id);
  }

  return map;
}

function resolveMonthValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}/.test(text)) return text.slice(0, 7);
  if (/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.test(text)) return toMonth(text);

  const monthKey = MONTH_NAMES[text.toLowerCase()];
  if (monthKey) {
    const year = new Date().getFullYear();
    return `${year}-${monthKey}`;
  }

  return toMonth(text);
}

function targetRowMonth(target) {
  return resolveMonthValue(target.Month || target.Aug || target.Date);
}

function targetRowDate(target) {
  return toDate(target.Date);
}

function isKnownTargetField(field) {
  return KNOWN_TARGET_ROW_FIELDS.has(normalizeFieldName(field));
}

function getTargetRowProductTargets(target, productNameToId = new Map()) {
  const productTargets = new Map();
  const productId = String(target.ProductID || target.ProductId || target.productId || "").trim();
  if (productId) {
    const amount = toNumber(target.TargetPieces || target.targetPieces || target.Target_Pieces);
    if (amount) productTargets.set(productId, amount);
  }

  Object.entries(target).forEach(([key, value]) => {
    const header = String(key ?? "").trim();
    if (!header || isKnownTargetField(header)) return;
    if (value == null || String(value).trim() === "") return;

    const amount = toNumber(value);
    if (!amount) return;

    const normalizedName = normalizeProductName(header);
    // Try direct header lookup (exact or lowercased) before fuzzy matching.
    const headerKey = String(header || "").trim();
    let id = productNameToId.get(headerKey) || productNameToId.get(headerKey.toLowerCase()) || productNameToId.get(normalizedName);
    if (!id && headerKey.includes(" ")) {
      const compactKey = headerKey.replace(/\s+/g, " ").trim();
      id = productNameToId.get(compactKey) || productNameToId.get(compactKey.toLowerCase());
    }
    if (!id && normalizedName) {
      const headerSansNumbers = normalizedName.replace(/\d+/g, "").trim();
      id = productNameToId.get(headerSansNumbers);
    }
    if (!id) {
      // Token-based fuzzy matching: choose known key with best token overlap.
      const tokens = normalizedName.split(" ").filter(Boolean);
      let best = { score: 0, id: null };
      for (const [knownKey, knownId] of productNameToId.entries()) {
        if (!knownKey) continue;
        const knownTokens = knownKey.split(" ").filter(Boolean);
        const intersection = tokens.filter((t) => knownTokens.includes(t)).length;
        if (!intersection) continue;
        const score = intersection / Math.max(tokens.length, knownTokens.length);
        if (score > best.score) best = { score, id: knownId };
      }
      if (best.score >= 0.4) id = best.id;
    }
    if (!id) return;
    productTargets.set(id, (productTargets.get(id) || 0) + amount);
  });

  return productTargets;
}

function getTargetRowTotalPieces(target, productNameToId = new Map()) {
  const productTargets = getTargetRowProductTargets(target, productNameToId);
  return [...productTargets.values()].reduce((total, value) => total + value, 0);
}

function matchesDelegateRow(row, delegate) {
  const rowId = String(row.DelegateID || row.DelegateId || "" ).trim();
  const rowName = String(row.DelegateName || row.Delegate || row.Name || "").trim();

  if (typeof delegate === "string") {
    const id = String(delegate || "").trim();
    if (id && rowId && id === rowId) return true;
    return false;
  }

  const id = String(delegate?.delegateId || delegate?.id || delegate?.DelegateID || "").trim();
  const name = String(delegate?.name || delegate?.delegateName || delegate?.DelegateName || "").trim();

  if (id && rowId && id === rowId) return true;
  if (name && rowName && name === rowName) return true;
  return false;
}

module.exports = {
  buildProductNameToIdMap,
  targetRowMonth,
  targetRowDate,
  getTargetRowProductTargets,
  getTargetRowTotalPieces,
  matchesDelegateRow,
  normalizeProductName,
  isKnownTargetField,
};
