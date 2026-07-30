const service = require("../services/product.service");

async function getProducts(req, res) {
  try {
    const products = await service.getAll();

    res.json({
      success: true,
      message: "Products loaded successfully",
      data: products,
    });
  } catch (error) {
    console.error("Product Controller Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load products",
      error: error.message,
    });
  }
}

module.exports = {
  getProducts,
};