const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");
const controller = require("../controllers/shortage.controller");

const router = express.Router();

router.get("/", authenticate, authorizeRoles("Delegate"), controller.getShortages);
router.post("/", authenticate, authorizeRoles("Delegate"), controller.addShortages);
router.patch("/:shortageId/status", authenticate, authorizeRoles("Supervisor", "Management"), controller.changeShortageStatus);

module.exports = router;
