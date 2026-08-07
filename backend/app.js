const authRoutes = require("./routes/auth.routes");
const branchRoutes = require("./routes/branch.routes");
const productRoutes = require("./routes/product.routes");
const productGuideRoutes = require("./routes/product-guide.routes");
const reportRoutes = require("./routes/report.routes");
const visitRoutes = require("./routes/visit.routes");
const dashboardRoutes = require("./routes/dashboard");
const oversightRoutes = require("./routes/oversight.routes");
const profileRoutes = require("./routes/profile.routes");
const shortageRoutes = require("./routes/shortage.routes");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { apiRateLimit } = require("./middleware/api-rate-limit.middleware");
const MOCK_SHEETS = String(process.env.MOCK_SHEETS || "").toLowerCase() === "true";

const app = express();
app.set("trust proxy", 1);
const isDevelopment = process.env.NODE_ENV !== "production";
const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const deploymentOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
const allowedOrigins = new Set([
  ...configuredOrigins,
  ...(deploymentOrigin ? [deploymentOrigin] : []),
  ...(isDevelopment ? defaultOrigins : []),
]);
const localDevelopmentOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/;

function isSameOriginRequest(req, origin) {
  try {
    const originUrl = new URL(origin);
    const requestHost = String(req.get("host") || "").toLowerCase();
    const requestProtocol = String(req.protocol || "").toLowerCase();
    return originUrl.host.toLowerCase() === requestHost
      && (!requestProtocol || originUrl.protocol === `${requestProtocol}:`);
  } catch {
    return false;
  }
}

// Middlewares
app.use(helmet());
app.use((req, res, next) => cors({
  origin(origin, callback) {
    if (
      !origin
      || isSameOriginRequest(req, origin)
      || allowedOrigins.has(origin)
      || (isDevelopment && localDevelopmentOrigin.test(origin))
    ) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CORS"));
  },
})(req, res, next));
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

// Health Check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Clorox Sales API is Running",
  });
});

app.get("/api/health", (req, res) => {
  const ready = Boolean(process.env.SPREADSHEET_ID && process.env.JWT_SECRET && (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT));
  res.status(ready ? 200 : 503).json({
    success: ready,
    message: ready ? "Clorox Sales API is Running" : "Clorox Sales API configuration is incomplete",
  });
});

// Development-only debug routes for local mock verification
{
  const fs = require("fs");
  const path = require("path");
  app.get("/api/debug/targets", async (req, res) => {
    try {
      const mockPath = path.join(__dirname, "mock-sheets", "Targets.json");
      if (fs.existsSync(mockPath)) {
        const content = JSON.parse(fs.readFileSync(mockPath, "utf8"));
        return res.json({ success: true, data: content });
      }

      // fallback to real sheet service if mock file missing
      const { getSheetRows } = require("./services/sheets.service");
      const data = await getSheetRows("Targets");
      return res.json({ success: true, data });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get("/api/debug/visit-init", async (req, res) => {
    try {
      const visitService = require("./services/visit.service");
      const user = { delegateId: req.query.delegateId || req.query.delegate || "D001", id: req.query.id || "", name: req.query.name || "" };
      const data = await visitService.getInitData(user, { date: req.query.date, branchId: req.query.branchId, branchName: req.query.branchName });
      return res.json({ success: true, data });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get("/api/debug/targets-filter", async (req, res) => {
    try {
      const { getSheetRows } = require("./services/sheets.service");
      const { buildProductNameToIdMap, getTargetRowProductTargets, getTargetRowTotalPieces, matchesDelegateRow, normalizeProductName, isKnownTargetField } = require("./services/target.service");
      let productSheet;
      let targetSheet;
      let source = "google";
      const useMock = MOCK_SHEETS || String(req.query.useMock || req.query.mock || "").toLowerCase() === "true";
      const mockProductPath = path.join(__dirname, "mock-sheets", "Products.json");
      const mockTargetPath = path.join(__dirname, "mock-sheets", "Targets.json");

      if (useMock && fs.existsSync(mockProductPath)) {
        productSheet = JSON.parse(fs.readFileSync(mockProductPath, "utf8"));
        source = "mock";
      }
      if (!productSheet) {
        productSheet = await getSheetRows("Products");
      }

      if (useMock && fs.existsSync(mockTargetPath)) {
        targetSheet = JSON.parse(fs.readFileSync(mockTargetPath, "utf8"));
        source = "mock";
      }
      if (!targetSheet) {
        targetSheet = await getSheetRows("Targets");
      }

      const productNameToId = buildProductNameToIdMap(productSheet.rows);
      const user = { delegateId: req.query.delegateId || req.query.delegate || "D001", id: req.query.id || "", name: req.query.name || "" };
      const date = req.query.date || "";
      const branch = { BranchID: req.query.branchId, BranchName: req.query.branchName };

      const matched = (targetSheet.rows || []).map((target) => {
        const headerMatches = [];
        Object.entries(target).forEach(([key, value]) => {
          const header = String(key || "").trim();
          if (!header || isKnownTargetField(header)) return;
          if (value == null || String(value).trim() === "") return;
          const normalizedName = normalizeProductName(header);
          let matchedId = productNameToId.get(header) || productNameToId.get(header.toLowerCase()) || productNameToId.get(normalizedName);
          if (!matchedId) {
            const tokens = normalizedName.split(" ").filter(Boolean);
            let best = { score: 0, id: null };
            for (const [knownKey, knownId] of productNameToId.entries()) {
              if (!knownKey) continue;
              const knownTokens = knownKey.split(" ").filter(Boolean);
              const intersection = tokens.filter((token) => knownTokens.includes(token)).length;
              if (!intersection) continue;
              const score = intersection / Math.max(tokens.length, knownTokens.length);
              if (score > best.score) best = { score, id: knownId };
            }
            if (best.score >= 0.4) matchedId = best.id;
          }
          headerMatches.push({ header, normalizedName, matchedId: matchedId || null, value: String(value) });
        });

        const matchesDelegate = matchesDelegateRow(target, user);
        const dateValue = target.Date || target.Month || "";
        const sameDate = dateValue ? (String(dateValue).startsWith(date) || String(dateValue) === date) : true;
        const matchesBranch = branch.BranchName ? String(target.BranchName || "").trim() === String(branch.BranchName || "").trim() : true;
        const matches = matchesDelegate && sameDate && matchesBranch;
        return {
          row: target,
          matchesDelegate,
          sameDate,
          matchesBranch,
          matches,
          productTargets: Object.fromEntries(getTargetRowProductTargets(target, productNameToId)),
          headerMatches,
        };
      }).filter((item) => item.matches);

      return res.json({ success: true, source, productNameToIdKeys: [...productNameToId.keys()], matched });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  });
}

app.use("/api", apiRateLimit);
app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/products", productRoutes);
app.use("/api/product-guide", productGuideRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/oversight", oversightRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/shortages", shortageRoutes);

// API Prefix
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API Route Not Found",
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.message === "Origin is not allowed by CORS") {
    console.warn("CORS rejection:", req.get("origin") || "no origin");
    return res.status(403).json({ success: false, message: "Origin is not allowed" });
  }
  console.error("Unhandled API error:", error);
  return res.status(error.statusCode || 500).json({
    success: false,
    message: "Unexpected API error",
  });
});

module.exports = app;
