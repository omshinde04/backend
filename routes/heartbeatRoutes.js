const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { heartbeat } = require("../controllers/heartbeatController");

// ❤️ Heartbeat
router.post("/", authMiddleware, heartbeat);

module.exports = router;
