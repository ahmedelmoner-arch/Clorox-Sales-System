const service = require("../services/visit.service");

async function init(req, res) {
  try {
    const data = await service.getInitData(req.user, {
      date: req.query.date,
      branchId: req.query.branchId,
      branchName: req.query.branchName,
    });

    return res.json({
      success: true,
      message: "Visit initialized successfully",
      data,
    });
  } catch (error) {
    console.error("Visit Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  init,
};
