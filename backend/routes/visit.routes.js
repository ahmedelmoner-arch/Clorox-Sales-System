const express = require("express");
const router = express.Router();

const visitController = require("../controllers/visit.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");

router.get("/init", authenticate, authorizeRoles("Delegate"), visitController.init);

module.exports = router;
