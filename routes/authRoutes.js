const express = require("express");
const router = express.Router();
const { registerStation, loginStation } = require("../controllers/authController");

router.post("/register", registerStation);
router.post("/login", loginStation);

module.exports = router;
