const { getDelegateDrilldown, getInvoiceAnalysis, getOversightData, getSupervisorDrilldown } = require("../services/oversight.service");

async function getOversight(req, res) {
  try {
    const data = await getOversightData(req.user, { month: req.query.month, date: req.query.date });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getDelegateDetails(req, res) {
  try {
    const data = await getDelegateDrilldown(req.user, { delegateId: req.params.delegateId, month: req.query.month, date: req.query.date });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

async function getSupervisorTeamDetails(req, res) {
  try {
    const data = await getSupervisorDrilldown(req.user, {
      supervisorId: req.params.supervisorId,
      month: req.query.month,
      date: req.query.date,
    });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

async function getInvoices(req, res) {
  try {
    const data = await getInvoiceAnalysis(req.user, { month: req.query.month });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

module.exports = { getDelegateDetails, getInvoices, getOversight, getSupervisorTeamDetails };
