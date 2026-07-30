const { getDelegateDrilldown, getOversightData } = require("../services/oversight.service");

async function getOversight(req, res) {
  try {
    const data = await getOversightData(req.user, { month: req.query.month });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getDelegateDetails(req, res) {
  try {
    const data = await getDelegateDrilldown(req.user, { delegateId: req.params.delegateId, month: req.query.month });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

module.exports = { getDelegateDetails, getOversight };
