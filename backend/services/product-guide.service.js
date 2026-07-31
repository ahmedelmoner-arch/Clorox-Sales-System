const { getSheetRows } = require("./sheets.service");

const SHEET_NAME = "ProductGuide";
const inactiveValues = new Set(["0", "false", "no", "inactive", "غير نشط", "لا"]);

function text(value) {
  return String(value ?? "").trim();
}

function pick(row, keys) {
  for (const key of keys) {
    if (text(row[key])) return text(row[key]);
  }
  return "";
}

function toBullets(value) {
  return text(value)
    .split(/\r?\n|[;•]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isActive(value) {
  return !inactiveValues.has(text(value).toLowerCase());
}

function normalizePdfUrl(value) {
  const url = text(value);
  if (!url) return "";
  if (/^[\w-]{20,}$/.test(url)) return `https://drive.google.com/file/d/${url}/view`;
  return url;
}

async function getProductGuide() {
  const { rows } = await getSheetRows(SHEET_NAME);
  const defaultPdfUrl = normalizePdfUrl(process.env.PRODUCT_GUIDE_PDF_URL);

  const products = rows
    .filter((row) => isActive(row.Active))
    .map((row) => {
      const pdfPage = Number(pick(row, ["PdfPage", "PDFPage", "Page"]));
      return {
        productId: pick(row, ["ProductID", "ProductId", "Code"]),
        productName: pick(row, ["ProductName", "Product", "Name"]),
        category: pick(row, ["Category", "CategoryName"]) || "منتجات أخرى",
        shortDescription: pick(row, ["ShortDescription", "Description"]),
        keyBenefits: toBullets(pick(row, ["KeyBenefits", "Benefits"])),
        usage: toBullets(pick(row, ["Usage", "HowToUse"])),
        pdfPage: Number.isInteger(pdfPage) && pdfPage > 0 ? pdfPage : null,
        pdfUrl: normalizePdfUrl(pick(row, ["PdfUrl", "PDFUrl", "DriveUrl", "PdfLink", "DriveLink"])) || defaultPdfUrl,
      };
    })
    .filter((product) => product.productName || product.productId);

  return {
    products,
    document: {
      title: "كتيب المنتجات",
      url: defaultPdfUrl || products.find((product) => product.pdfUrl)?.pdfUrl || "",
    },
  };
}

module.exports = { getProductGuide };
