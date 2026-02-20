const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { updateLocation } = require("../controllers/locationController");

// 📍 Update Live Location
router.post("/update", authMiddleware, updateLocation);

module.exports = router;
