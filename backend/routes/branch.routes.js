const express = require("express");
const controller = require("../controllers/branch.controller");

const router = express.Router();

router.get("/", controller.getBranches);

module.exports = router;