const express = require("express");
const router = express.Router();
const logController = require("../controllers/logController");
const adminAuth = require("../middleware/adminAuthMiddleware");

router.post("/client-log", adminAuth, logController.clientLog);

module.exports = router;