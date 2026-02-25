const express = require("express");
const router = express.Router();
const logController = require("../controllers/logController");
const auth = require("../middleware/auth");

router.post("/client-log", auth, logController.clientLog);

module.exports = router;