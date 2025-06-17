const express = require("express");
const tripController = require("../controllers/tripController");
const { protect } = require("../middlewares/authMiddleware");
const router = express.Router();

// Create New Trip
router.post("/", protect, tripController.createTrip);
router.get("/", protect, tripController.getTrips);
router.get("/active", protect, tripController.getActiveTripByDriver);
router.get("/:tripId", protect, tripController.getTripById);

// Change Status of trip
router.put("/:tripId/status", protect, tripController.changeStatus);

module.exports = router;
