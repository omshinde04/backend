const express = require("express");
const router = express.Router();

const {
    getStatusDistribution,
    getDailyViolations,
    getTopViolators
} = require("../controllers/analyticsController");

// Optional: protect with JWT middleware
// const verifyToken = require("../middleware/verifyToken");
// router.use(verifyToken);

router.get("/status", getStatusDistribution);
router.get("/daily", getDailyViolations);
router.get("/top", getTopViolators);

module.exports = router;