/*
 * Synchronizes local product artwork names with the Products Google Sheet.
 *
 * Default mode is read-only. Run `npm run sync:product-images -- --apply`
 * only after reviewing its proposed matches.
 */
const fs = require("fs/promises");
const path = require("path");
const { sheets } = require("../config/google");
const { SPREADSHEET_ID } = require("../config/env");
const { getSheetRows, invalidateSheetCache } = require("../services/sheets.service");

const PRODUCTS_SHEET = "Products";
const ASSETS_DIRECTORY = path.resolve(__dirname, "../../frontend/public/products");
const IMAGE_EXTENSION = /\.(?:webp|png|jpe?g)$/i;
const APPLY = process.argv.includes("--apply");

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/(\d)\s*(?:lit|liter|litre)\b/g, "$1l")
    .replace(/(\d)\.(\d)/g, "$1decimal$2")
    .replace(/[._-]+/g, " ")
    .replace(/decimal/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

function pathForBrowser(relativePath) {
  return String(relativePath).replace(/\\/g, "/");
}

async function readImageFiles(directory, prefix = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) return readImageFiles(path.join(directory, entry.name), relativePath);
    return entry.isFile() && IMAGE_EXTENSION.test(entry.name) ? [pathForBrowser(relativePath)] : [];
  }));
  return files.flat().sort((left, right) => left.localeCompare(right));
}

function stem(file) {
  return normalize(path.basename(file).replace(IMAGE_EXTENSION, "").replace(/\b\d{8,}\b/g, ""));
}

function hasAll(source, terms) {
  return terms.every((term) => source.includes(normalize(term)));
}

function oneOf(source, terms) {
  return terms.some((term) => source.includes(normalize(term)));
}

function volumeOf(name) {
  const match = normalize(name).match(/(?<![a-z0-9])(\d+(?:\.\d+)?)\s*(ml|gm|kg|l)\b/);
  return match ? `${match[1]}${match[2]}` : "";
}

function variantOf(name) {
  const value = normalize(name);
  if (/\b(sb|sea breeze)\b/.test(value)) return ["sea breeze"];
  if (/\b(lav|lavender)\b/.test(value)) return ["lavender"];
  if (/\blemon\b/.test(value) || /\bl\b/.test(value)) return ["lemon"];
  if (/\b(floral|floral magic)\b/.test(value) || /\bf\b/.test(value)) return ["floral"];
  if (/\bmint|mint freshness\b/.test(value) || /\bm\b/.test(value)) return ["mint"];
  return [];
}

function categoryCandidates(row, images) {
  const category = normalize(row.Category).replace(/\s/g, "");
  const name = normalize(row.ProductName);
  const volume = volumeOf(row.ProductName);
  const variant = variantOf(row.ProductName);

  if (category === "bundles") {
    const code = String(row.ProductName || "").match(/bundle\s*-?\s*([a-z]{1,2})\b/i)?.[1];
    if (!code) return [];
    return images.filter((file) => new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*-`, "i").test(path.basename(file)));
  }

  const matches = (required, excluded = []) => images.filter((file) => {
    const source = stem(file);
    return hasAll(source, required) && !oneOf(source, excluded);
  });

  if (category === "5x1") {
    if (!volume || !variant.length) return [];
    return matches(["5x1", volume, ...variant]);
  }

  if (category === "gel") {
    if (!volume || !variant.length) return [];
    const gelVariant = { lemon: "citrus purity", floral: "floral magic", mint: "mint freshness" }[variant[0]];
    return gelVariant ? matches(["clorogel", volume, gelVariant]) : [];
  }

  if (category === "cc") {
    if (name.includes("pre treater")) return matches(["clothes pretreater", "500ml"]);
    if (!volume) return [];
    return matches(["clothes", volume], ["pretreater"]);
  }

  if (category === "trigger") {
    if (name.includes("bathroom")) return matches(["bathroom cleaner", "500ml"]);
    if (name.includes("lemon")) return matches(["kitchen cleaner lemon", "500ml"]);
    return matches(["kitchen cleaner", "500ml"], ["lemon"]);
  }

  if (category === "wipes") {
    if (name.includes("multipurpose cleaner")) return matches(["multi purpose cleaner", "trigger", "500ml"]);
    const count = name.match(/\b(10|20|40)\b/)?.[1];
    const scent = name.includes("lemon") ? "lemon" : name.includes("fresh") ? "fresh" : "";
    return count && scent ? matches(["wipes", scent, count]) : [];
  }

  if (category === "mpc") {
    if (name.includes("h gallon")) return matches(["multi purpose cleaner", "1.89l"], ["trigger"]);
    if (!volume) return [];
    return matches(["multi purpose cleaner", volume], ["trigger"]);
  }

  if (category === "cfc") {
    if (!volume) return [];
    const selectedVariant = variant[0] || "";
    const otherVariants = ["floral", "lavender"].filter((value) => value !== selectedVariant);
    return matches(["colors", volume, ...(selectedVariant ? [selectedVariant] : [])], selectedVariant ? otherVariants : ["floral", "lavender"]);
  }

  if (category === "clb") {
    if (name.includes("saving pack")) return matches(["saving pack", "1kg"]);
    if (name.includes("h gallon")) return matches(["liquid bleach", "1.89l"]);
    if (name.includes("r gallon")) return matches(["liquid bleach", "3.79l"]);
    if (!volume) return [];
    const selectedVariant = variant[0] || "";
    const otherVariants = ["floral", "lavender", "lemon"].filter((value) => value !== selectedVariant);
    return matches(["liquid bleach", volume, ...(selectedVariant ? [selectedVariant] : [])], selectedVariant ? otherVariants : ["floral", "lavender", "lemon"]);
  }

  if (category === "pwd") {
    // Do not infer 200gm/500gm from the available 250gm/450gm artwork.
    return name.includes("30gm") ? matches(["powder", "30gm"]) : [];
  }

  if (category === "clt" && name.includes("clorita")) return matches(["clorita"]);

  return [];
}

function localImageValue(value, images) {
  const source = pathForBrowser(String(value || "").trim());
  const lookup = new Map(images.map((file) => [file.toLocaleLowerCase(), file]));
  return lookup.get(source.toLocaleLowerCase()) || "";
}

function columnLetter(number) {
  let value = number;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

async function main() {
  if (!SPREADSHEET_ID) throw new Error("SPREADSHEET_ID is missing in backend/.env");
  const images = await readImageFiles(ASSETS_DIRECTORY);
  if (!images.length) throw new Error(`No images found in ${ASSETS_DIRECTORY}`);

  const { headers, rows, rowNumbers } = await getSheetRows(PRODUCTS_SHEET);
  const imageColumn = headers.indexOf("ImageUrl");
  if (imageColumn < 0) throw new Error("Products sheet must include an ImageUrl column");

  const results = rows.map((row, index) => {
    const existing = localImageValue(row.ImageUrl, images);
    const candidates = categoryCandidates(row, images);
    const uniqueCandidates = [...new Set(candidates)];
    const candidate = uniqueCandidates.length === 1 ? uniqueCandidates[0] : "";
    const status = existing ? "already-linked" : candidate ? "ready" : uniqueCandidates.length ? "ambiguous" : "unmatched";
    return { row, rowNumber: rowNumbers[index], existing, candidates: uniqueCandidates, candidate, status };
  });

  const updates = results.filter((result) => result.candidate && result.candidate !== result.existing && result.row.ImageUrl !== result.candidate);
  const summary = results.reduce((counts, result) => ({ ...counts, [result.status]: counts[result.status] + 1 }), { "already-linked": 0, ready: 0, ambiguous: 0, unmatched: 0 });

  console.log(`Images: ${images.length} | Products: ${rows.length}`);
  console.log(`Ready: ${summary.ready} | Already linked: ${summary["already-linked"]} | Ambiguous: ${summary.ambiguous} | Unmatched: ${summary.unmatched}`);
  updates.forEach(({ row, rowNumber, candidate }) => console.log(`UPDATE row ${rowNumber}: [${row.ProductID}] ${row.ProductName} -> ${candidate}`));
  results.filter((result) => result.status === "ambiguous").forEach(({ row, candidates }) => console.log(`AMBIGUOUS: [${row.ProductID}] ${row.ProductName} -> ${candidates.join(" | ")}`));
  results.filter((result) => result.status === "unmatched").forEach(({ row }) => console.log(`UNMATCHED: [${row.ProductID}] ${row.ProductName}`));

  if (!APPLY) {
    console.log("Dry run only. Review the list, then run: npm run sync:product-images -- --apply");
    return;
  }

  if (!updates.length) {
    console.log("No Google Sheet cells need updating.");
    return;
  }

  const imageColumnLetter = columnLetter(imageColumn + 1);
  const response = await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: "RAW",
      data: updates.map(({ rowNumber, candidate }) => ({ range: `${PRODUCTS_SHEET}!${imageColumnLetter}${rowNumber}`, values: [[candidate]] })),
    },
  });
  invalidateSheetCache(PRODUCTS_SHEET);
  console.log(`Updated ${response.data.totalUpdatedCells || updates.length} ImageUrl cells in ${PRODUCTS_SHEET}.`);
}

main().catch((error) => {
  console.error(`Image synchronization failed: ${error.message}`);
  process.exitCode = 1;
});
