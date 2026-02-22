const express = require("express");
const router = express.Router();
const logController = require("../controllers/logController");

router.post("/client-log", logController.clientLog);

module.exports = router;