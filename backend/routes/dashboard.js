const express = require("express");

const router = express.Router();

const {
    getDashboard
} = require("../controllers/dashboardController");
const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");

router.get("/", authenticate, authorizeRoles("Delegate"), getDashboard);

module.exports = router;
