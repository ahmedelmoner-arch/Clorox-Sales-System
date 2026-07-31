const service = require("../services/product-guide.service");

async function getProductGuide(req, res) {
  try {
    const guide = await service.getProductGuide();
    res.json({ success: true, data: guide });
  } catch (error) {
    console.error("Product guide controller error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: "تعذر تحميل دليل المنتجات من Google Sheets.",
    });
  }
}

module.exports = { getProductGuide };
