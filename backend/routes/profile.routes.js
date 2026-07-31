const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");
const { getProfile, updateAvatar, updateProfile } = require("../controllers/profile.controller");

const router = express.Router();

router.get("/", authenticate, authorizeRoles("Delegate"), getProfile);
router.put("/", authenticate, authorizeRoles("Delegate"), updateProfile);
router.put("/avatar", authenticate, authorizeRoles("Delegate"), updateAvatar);

module.exports = router;
