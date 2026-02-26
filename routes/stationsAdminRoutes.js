const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuthMiddleware");
const controller = require("../controllers/stationsAdminController");

router.get("/", adminAuth, controller.getStations);
router.post("/", adminAuth, controller.createStation);
router.put("/:id", adminAuth, controller.updateStation);

module.exports = router;