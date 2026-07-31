const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");
const { updateAvatar } = require("../controllers/profile.controller");

const router = express.Router();

router.put("/avatar", authenticate, authorizeRoles("Delegate"), updateAvatar);

module.exports = router;
