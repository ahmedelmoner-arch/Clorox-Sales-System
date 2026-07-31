const express = require("express");
const controller = require("../controllers/product-guide.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", authenticate, controller.getProductGuide);

module.exports = router;
