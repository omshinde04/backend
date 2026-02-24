const express = require("express");
const router = express.Router();
const { reverseGeocode } = require("../controllers/geocodeController");

// GET /api/geocode?lat=...&lng=...
router.get("/", reverseGeocode);

module.exports = router;