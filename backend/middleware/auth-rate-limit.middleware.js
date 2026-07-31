const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function removeExpiredAttempts(now) {
  for (const [key, timestamps] of attempts) {
    const recent = timestamps.filter((time) => now - time < WINDOW_MS);
    if (recent.length) attempts.set(key, recent);
    else attempts.delete(key);
  }
}

function loginRateLimit(req, res, next) {
  const now = Date.now();
  removeExpiredAttempts(now);
  const key = req.ip || "unknown";
  const recentAttempts = (attempts.get(key) || []).filter((time) => now - time < WINDOW_MS);

  if (recentAttempts.length >= MAX_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again later.",
    });
  }

  recentAttempts.push(now);
  attempts.set(key, recentAttempts);
  req.loginAttemptKey = key;
  return next();
}

function clearLoginAttempts(req) {
  if (req.loginAttemptKey) attempts.delete(req.loginAttemptKey);
}

module.exports = { clearLoginAttempts, loginRateLimit };
