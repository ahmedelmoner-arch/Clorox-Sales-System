const branchService = require("../services/branch.service");

async function getBranches(req, res) {
  try {
    const branches = await branchService.getBranches();

    res.json({
      success: true,
      count: branches.length,
      data: branches,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  getBranches,
};