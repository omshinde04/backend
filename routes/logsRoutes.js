const express = require("express");
const router = express.Router();
const logsController = require("../controllers/logsController");
const adminAuth = require("../middleware/adminAuthMiddleware");

router.get("/", adminAuth, logsController.getLogs);
router.get("/export", adminAuth, logsController.exportLogsCSV);


module.exports = router;