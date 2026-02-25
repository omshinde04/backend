const express = require("express");
const router = express.Router();
const { login } = require("../controllers/loginController");

router.post("/login", login);  // ❌ NO auth here

module.exports = router;