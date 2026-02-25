const express = require("express");
const router = express.Router();

const {
    getStatusDistribution,
    getDailyViolations,
    getTopViolators
} = require("../controllers/analyticsController");
const auth = require("../middleware/auth");

// Optional: protect with JWT middleware
// const verifyToken = require("../middleware/verifyToken");
// router.use(verifyToken);

router.get("/status", auth, getStatusDistribution);
router.get("/daily", auth, getDailyViolations);
router.get("/top", auth, getTopViolators);

module.exports = router;