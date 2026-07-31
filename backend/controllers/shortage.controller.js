const { createShortages, getShortageAnalytics, updateShortageStatus } = require("../services/shortage.service");

async function getShortages(req, res) {
  try {
    const data = await getShortageAnalytics(req.user, { month: req.query.month });
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
}

async function addShortages(req, res) {
  try {
    const data = await createShortages(req.user, req.body);
    return res.status(201).json({ success: true, message: "Product shortages saved successfully", data });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}

async function changeShortageStatus(req, res) {
  try {
    const data = await updateShortageStatus(req.user, req.params.shortageId, req.body.status);
    return res.json({ success: true, message: "Shortage status updated successfully", data });
  } catch (error) {
    return res.status(error.statusCode || 400).json({ success: false, message: error.message });
  }
}

module.exports = { addShortages, changeShortageStatus, getShortages };
