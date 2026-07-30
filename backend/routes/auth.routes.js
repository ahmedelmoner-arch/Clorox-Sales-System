const express = require("express");
const router = express.Router();

const { login } = require("../controllers/auth.controller");
const { loginRateLimit } = require("../middleware/auth-rate-limit.middleware");

router.post("/login", loginRateLimit, login);

module.exports = router;
