const { getSheetRows } = require("./sheets.service");
const productService = require("./product.service");

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
  const localPath = url.replace(/\\/g, "/");
  const segments = localPath.split("/");
  if (!/^[a-z][\w+.-]*:\/\//i.test(localPath) && !localPath.startsWith("/") && /\.pdf$/i.test(localPath) && !segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return `/products/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
  }
  return url;
}

function localImagePath(value) {
  const relativePath = text(value).replace(/\\/g, "/");
  const segments = relativePath.split("/");
  if (!relativePath || /^[a-z][\w+.-]*:\/\//i.test(relativePath) || relativePath.startsWith("/") || !/\.(?:webp|png|jpe?g)$/i.test(relativePath) || segments.some((segment) => !segment || segment === "." || segment === "..")) return "";
  return `/products/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
}

async function getProductGuide() {
  const [{ rows }, productRows] = await Promise.all([
    getSheetRows(SHEET_NAME),
    productService.getAll(),
  ]);
  const defaultPdfUrl = normalizePdfUrl(process.env.PRODUCT_GUIDE_PDF_URL);
  const imageProducts = new Map(productRows.map((product) => [text(product.ProductID), product]));

  const products = rows
    .filter((row) => isActive(row.Active))
    .map((row) => {
      const pdfPage = Number(pick(row, ["PdfPage", "PDFPage", "Page"]));
      const productId = pick(row, ["ProductID", "ProductId", "Code"]);
      const imageProduct = imageProducts.get(productId);
      return {
        productId,
        productName: pick(row, ["ProductName", "Product", "Name"]),
        category: pick(row, ["Category", "CategoryName"]) || "منتجات أخرى",
        shortDescription: pick(row, ["ShortDescription", "Description"]),
        keyBenefits: toBullets(pick(row, ["KeyBenefits", "Benefits"])),
        usage: toBullets(pick(row, ["Usage", "HowToUse"])),
        pdfPage: Number.isInteger(pdfPage) && pdfPage > 0 ? pdfPage : null,
        pdfUrl: normalizePdfUrl(pick(row, ["PdfUrl", "PDFUrl", "DriveUrl", "PdfLink", "DriveLink"])) || defaultPdfUrl,
        hasImage: Boolean(text(imageProduct?.ImageUrl || imageProduct?.ProductImage)),
        imagePath: localImagePath(imageProduct?.ImageUrl || imageProduct?.ProductImage),
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
