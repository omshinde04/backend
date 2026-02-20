const express = require("express");
const router = express.Router();

const {
    registerStation,
    loginStation,
    autoLogin
} = require("../controllers/authController");

// 🔐 Manual Register (Optional – can disable in production)
router.post("/register", registerStation);

// 🔐 Manual Login (Optional – can disable later)
router.post("/login", loginStation);

// 🚀 Auto Login (Production)
router.post("/auto-login", autoLogin);

module.exports = router;
