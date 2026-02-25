const express = require("express");
const router = express.Router();

const {
    getStatusDistribution,
    getDailyViolations,
    getTopViolators
} = require("../controllers/analyticsController");

const adminAuth = require("../middleware/adminAuthMiddleware");

router.get("/status", adminAuth, getStatusDistribution);
router.get("/daily", adminAuth, getDailyViolations);
router.get("/top", adminAuth, getTopViolators);

module.exports = router;