const { getSheetRows } = require("./sheets.service");

async function getAll() {
  const { rows } = await getSheetRows("Products");
  return rows;
}

function driveImageUrl(value) {
  const source = String(value || "").trim();
  if (!source || !/^https?:\/\//i.test(source)) return "";
  const fileMatch = source.match(/drive\.google\.com\/file\/d\/([^/?]+)/i);
  if (fileMatch) return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  const idMatch = source.match(/[?&]id=([^&]+)/i);
  return idMatch && /drive\.google\.com/i.test(source) ? `https://drive.google.com/uc?export=view&id=${idMatch[1]}` : source;
}

async function getImage(productId) {
  const products = await getAll();
  const product = products.find((item) => String(item.ProductID || "").trim() === String(productId || "").trim());
  const imageUrl = driveImageUrl(product?.ImageUrl || product?.ProductImage);
  if (!imageUrl) return null;

  const parsed = new URL(imageUrl);
  if (parsed.protocol !== "https:" || !["drive.google.com", "drive.usercontent.google.com"].includes(parsed.hostname)) {
    const error = new Error("Unsupported product image source");
    error.statusCode = 400;
    throw error;
  }

  const response = await fetch(imageUrl);
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (!response.ok || !contentType.startsWith("image/")) {
    const error = new Error("Product image could not be loaded");
    error.statusCode = 502;
    throw error;
  }
  if (contentLength > 3 * 1024 * 1024) {
    const error = new Error("Product image is too large");
    error.statusCode = 413;
    throw error;
  }

  return { contentType, buffer: Buffer.from(await response.arrayBuffer()) };
}

module.exports = {
  getAll,
  getImage,
};
