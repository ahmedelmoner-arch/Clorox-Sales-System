const express = require("express");
const controller = require("../controllers/product.controller");

const router = express.Router();

router.get("/", controller.getProducts);
router.get("/:productId/image", controller.getProductImage);

module.exports = router;
