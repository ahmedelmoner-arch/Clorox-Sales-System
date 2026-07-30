const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function loginRateLimit(req, res, next) {
  const key = req.ip;
  const now = Date.now();
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
