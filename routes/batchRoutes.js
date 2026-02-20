const express = require("express");
const router = express.Router();

const batchController = require("../controllers/batchController");
const verifyToken = require("../middleware/authMiddleware");

router.post(
    "/batch",   // ✅ correct
    verifyToken,
    batchController.batchUpdateLocation
);

module.exports = router;