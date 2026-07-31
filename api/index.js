const app = require("../backend/app");

module.exports = (req, res) => {
  const requestUrl = new URL(req.url, "http://localhost");
  const routedPath = requestUrl.searchParams.get("__vercel_path");

  if (routedPath !== null) {
    requestUrl.searchParams.delete("__vercel_path");
    const query = requestUrl.searchParams.toString();
    req.url = `/api/${routedPath}${query ? `?${query}` : ""}`;
  }

  return app(req, res);
};
