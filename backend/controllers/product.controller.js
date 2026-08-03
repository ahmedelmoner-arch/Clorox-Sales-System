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

async function getProductImage(req, res) {
  try {
    const image = await service.getImage(req.params.productId);
    if (!image) return res.status(404).json({ success: false, message: "Product image not found" });
    res.set({
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=86400",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    return res.send(image.buffer);
  } catch (error) {
    console.error("Product Image Controller Error:", error.message);
    return res.status(error.statusCode || 502).json({ success: false, message: "Failed to load product image" });
  }
}

module.exports = {
  getProducts,
  getProductImage,
};
