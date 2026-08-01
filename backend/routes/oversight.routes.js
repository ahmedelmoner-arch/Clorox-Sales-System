const express = require("express");
const { getDelegateDetails, getInvoices, getOversight } = require("../controllers/oversight.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", authenticate, authorizeRoles("Supervisor", "Management"), getOversight);
router.get("/invoices", authenticate, authorizeRoles("Management"), getInvoices);
router.get("/delegates/:delegateId", authenticate, authorizeRoles("Supervisor", "Management"), getDelegateDetails);

module.exports = router;
