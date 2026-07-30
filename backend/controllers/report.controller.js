const { createReport, getReportsForDelegate } = require("../services/report.service");

async function getReports(req, res) {
  try {
    const data = await getReportsForDelegate(req.user, req.query);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function addReport(req, res) {
  try {
    const data = await createReport(req.user, req.body);
    return res.status(201).json({ success: true, message: "Report saved successfully", data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = { addReport, getReports };
