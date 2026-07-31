const { loginUser } = require("../services/auth.service");
const { clearLoginAttempts } = require("../middleware/auth-rate-limit.middleware");

const login = async (req, res) => {
  try {
    const { code, delegateCode, secretCode, role } = req.body;
    const accessCode = String(code || delegateCode || "").trim();
    const normalizedSecretCode = String(secretCode || "").trim();

    if (!accessCode || !normalizedSecretCode) {
      return res.status(400).json({
        success: false,
        message: "Access code and secret code are required",
      });
    }

    if (accessCode.length > 100 || normalizedSecretCode.length > 256) {
      return res.status(400).json({
        success: false,
        message: "Access code or secret code is too long",
      });
    }

    const result = await loginUser({ role, code: accessCode, secretCode: normalizedSecretCode });

    if (!result.success) {
      return res.status(401).json(result);
    }

    clearLoginAttempts(req);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Login Error:", error);

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: statusCode === 503 ? error.message : "Unable to complete the login request",
    });
  }
};

module.exports = {
  login,
};
