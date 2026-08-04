const { getSheetRows } = require("./sheets.service");

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_REDIRECTS = 3;
const IMAGE_REQUEST_TIMEOUT_MS = 10000;
const ALLOWED_IMAGE_HOSTS = new Set(["drive.google.com", "drive.usercontent.google.com"]);

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

function trustedImageUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || !ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) {
    const error = new Error("Unsupported product image source");
    error.statusCode = 400;
    throw error;
  }
  return parsed;
}

async function fetchTrustedImage(value, redirectsRemaining = MAX_IMAGE_REDIRECTS) {
  const url = trustedImageUrl(value);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { redirect: "manual", signal: controller.signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirectsRemaining <= 0) {
        const error = new Error("Product image redirect was rejected");
        error.statusCode = 502;
        throw error;
      }
      return fetchTrustedImage(new URL(location, url).toString(), redirectsRemaining - 1);
    }
    return response;
  } catch (error) {
    if (error.name === "AbortError") {
      error.message = "Product image request timed out";
      error.statusCode = 504;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readImageBuffer(response) {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_IMAGE_BYTES) {
    const error = new Error("Product image is too large");
    error.statusCode = 413;
    throw error;
  }

  const reader = response.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_IMAGE_BYTES) {
      await reader.cancel();
      const error = new Error("Product image is too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, totalBytes);
}

async function getImage(productId) {
  const products = await getAll();
  const product = products.find((item) => String(item.ProductID || "").trim() === String(productId || "").trim());
  const imageUrl = driveImageUrl(product?.ImageUrl || product?.ProductImage);
  if (!imageUrl) return null;

  const response = await fetchTrustedImage(imageUrl);
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (!response.ok || !contentType.startsWith("image/")) {
    const error = new Error("Product image could not be loaded");
    error.statusCode = 502;
    throw error;
  }

  return { contentType, buffer: await readImageBuffer(response) };
}

module.exports = {
  getAll,
  getImage,
};
