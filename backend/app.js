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
