const authRoutes = require("./routes/auth.routes");
const branchRoutes = require("./routes/branch.routes");
const productRoutes = require("./routes/product.routes");
const reportRoutes = require("./routes/report.routes");
const visitRoutes = require("./routes/visit.routes");
const dashboardRoutes = require("./routes/dashboard");
const oversightRoutes = require("./routes/oversight.routes");
const express = require("express");
const cors = require("cors");

const app = express();
app.set("trust proxy", 1);
const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins = (process.env.CORS_ORIGINS || defaultOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isDevelopment = process.env.NODE_ENV !== "production";
const localDevelopmentOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/;
const vercelOrigin = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

// Middlewares
app.use(cors({
  origin(origin, callback) {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      (isDevelopment && localDevelopmentOrigin.test(origin)) ||
      (process.env.VERCEL && vercelOrigin.test(origin))
    ) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CORS"));
  },
}));
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

app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/products", productRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/oversight", oversightRoutes);

// API Prefix
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API Route Not Found",
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled API error:", error);
  if (res.headersSent) return next(error);
  return res.status(error.statusCode || 500).json({
    success: false,
    message: "Unexpected API error",
  });
});

module.exports = app;
