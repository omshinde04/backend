const express = require("express");
const router = express.Router();

const adminAuth = require("../middleware/adminAuthMiddleware");
const {
    getAllStations
} = require("../controllers/locationController");

router.get("/all", adminAuth, getAllStations);

module.exports = router;    