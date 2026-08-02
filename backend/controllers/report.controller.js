const { createReport, getReportForDelegate, getReportsForDelegate, updateReport } = require("../services/report.service");

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
    return res.status(data.alreadySaved ? 200 : 201).json({ success: true, message: data.alreadySaved ? "Report was already saved" : "Report saved successfully", data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
}

async function getReport(req, res) {
  try {
    const data = await getReportForDelegate(req.user, req.params.reportId);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}

async function editReport(req, res) {
  try {
    const data = await updateReport(req.user, req.params.reportId, req.body);
    return res.json({ success: true, message: "Report updated successfully", data });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}

module.exports = { addReport, editReport, getReport, getReports };
