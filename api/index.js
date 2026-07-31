let app;

function loadApp() {
  if (!app) app = require("../backend/app");
  return app;
}

function deploymentErrorMessage(error) {
  const message = String(error?.message || "");
  if (/JWT_SECRET.*required/i.test(message)) {
    return "المتغير JWT_SECRET غير موجود في إعدادات Production على Vercel.";
  }
  if (/default credentials|service account|GOOGLE_SERVICE_ACCOUNT_JSON/i.test(message)) {
    return "بيانات ربط Google Sheets غير مكتملة في إعدادات Vercel.";
  }
  if (/Cannot find module/i.test(message)) {
    return "تعذر تحميل إحدى مكتبات الخادم في حزمة Vercel.";
  }
  return "تعذر بدء خدمة البيانات. راجعي سجلات Vercel وإعدادات البيئة.";
}

module.exports = (req, res) => {
  try {
    const requestUrl = new URL(req.url, "http://localhost");
    const routedPath = requestUrl.searchParams.get("__vercel_path");

    if (routedPath !== null) {
      requestUrl.searchParams.delete("__vercel_path");
      const query = requestUrl.searchParams.toString();
      req.url = `/api/${routedPath}${query ? `?${query}` : ""}`;
    }

    return loadApp()(req, res);
  } catch (error) {
    console.error("API startup error:", error);
    return res.status(500).json({
      success: false,
      message: deploymentErrorMessage(error),
    });
  }
};
