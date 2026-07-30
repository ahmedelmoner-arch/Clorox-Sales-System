const { loginUser } = require("../services/auth.service");
const { clearLoginAttempts } = require("../middleware/auth-rate-limit.middleware");

const login = async (req, res) => {
  try {
    const { code, delegateCode, secretCode, role } = req.body;
    const accessCode = code || delegateCode;

    if (!accessCode || !secretCode) {
      return res.status(400).json({
        success: false,
        message: "Access code and secret code are required",
      });
    }

    const result = await loginUser({ role, code: accessCode, secretCode });

    if (!result.success) {
      return res.status(401).json(result);
    }

    clearLoginAttempts(req);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

module.exports = {
  login,
};
