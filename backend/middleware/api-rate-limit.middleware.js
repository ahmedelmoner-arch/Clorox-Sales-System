const requests = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 300;

function prune(now) {
  for (const [key, timestamps] of requests) {
    const recent = timestamps.filter((time) => now - time < WINDOW_MS);
    if (recent.length) requests.set(key, recent);
    else requests.delete(key);
  }
}

function apiRateLimit(req, res, next) {
  const now = Date.now();
  prune(now);
  const key = req.ip || "unknown";
  const recent = (requests.get(key) || []).filter((time) => now - time < WINDOW_MS);

  res.setHeader("RateLimit-Limit", String(MAX_REQUESTS));
  res.setHeader("RateLimit-Remaining", String(Math.max(0, MAX_REQUESTS - recent.length - 1)));

  if (recent.length >= MAX_REQUESTS) {
    res.setHeader("Retry-After", String(Math.ceil(WINDOW_MS / 1000)));
    return res.status(429).json({ success: false, message: "Too many requests. Please try again later." });
  }

  recent.push(now);
  requests.set(key, recent);
  return next();
}

module.exports = { apiRateLimit };
