const { toMonth, toNumber } = require("./sheets.service");

const UNIT_PRICE_SHEET = "UnitPrice";
const MONTH_COLUMNS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function hasValidUnitPrice(value) {
  const text = String(value ?? "").trim().replace(/,/g, "");
  return text !== "" && Number.isFinite(Number(text)) && Number(text) >= 0;
}

function priceMonthColumn(dateOrMonth) {
  const month = toMonth(dateOrMonth);
  const monthNumber = Number(month.slice(-2));
  return monthNumber >= 1 && monthNumber <= 12 ? MONTH_COLUMNS[monthNumber - 1] : "";
}

function createUnitPriceCatalog(rows) {
  return new Map(rows.map((row) => [String(row.ProductID || "").trim(), row]));
}

function getMonthlyUnitPrice(catalog, productId, dateOrMonth) {
  const month = priceMonthColumn(dateOrMonth);
  const priceRow = catalog.get(String(productId || "").trim());
  const value = month ? priceRow?.[month] : "";

  return {
    month,
    isConfigured: hasValidUnitPrice(value),
    unitPrice: hasValidUnitPrice(value) ? toNumber(value) : "",
  };
}

function addMonthlyUnitPrices(products, priceRows, dateOrMonth) {
  const catalog = createUnitPriceCatalog(priceRows);
  const month = priceMonthColumn(dateOrMonth);

  return products.map((product) => {
    const price = getMonthlyUnitPrice(catalog, product.ProductID, dateOrMonth);
    return {
      ...product,
      UnitPrice: price.unitPrice,
      unitPriceConfigured: price.isConfigured,
      unitPriceMonth: month,
    };
  });
}

module.exports = {
  UNIT_PRICE_SHEET,
  MONTH_COLUMNS,
  addMonthlyUnitPrices,
  createUnitPriceCatalog,
  getMonthlyUnitPrice,
  hasValidUnitPrice,
  priceMonthColumn,
};
