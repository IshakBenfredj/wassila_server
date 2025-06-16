const express = require("express");
const driverController = require("../controllers/driverController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.put(
    "/me",
    protect,
    driverController.updateDriverProfile
);

router.put(
    "/me/availability",
    protect,
    driverController.updateAvailability
);

module.exports = router;