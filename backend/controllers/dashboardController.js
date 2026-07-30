const { getDashboardData } = require("../services/dashboard.service");

async function getDashboard(req, res) {
  try {
    const data = await getDashboardData(req.user, { month: req.query.month });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { getDashboard };
