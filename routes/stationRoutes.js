const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
    getAllStations
} = require("../controllers/locationController");

// 📡 Fetch All Stations (Including Offline)
router.get("/all", authMiddleware, getAllStations);

module.exports = router;