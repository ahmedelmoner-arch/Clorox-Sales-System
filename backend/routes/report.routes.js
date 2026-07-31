const express = require("express");
const router = express.Router();
const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");
const controller = require("../controllers/report.controller");

router.get("/", authenticate, authorizeRoles("Delegate"), controller.getReports);
router.post("/", authenticate, authorizeRoles("Delegate"), controller.addReport);
router.get("/:reportId", authenticate, authorizeRoles("Delegate"), controller.getReport);
router.put("/:reportId", authenticate, authorizeRoles("Delegate"), controller.editReport);

module.exports = router;
