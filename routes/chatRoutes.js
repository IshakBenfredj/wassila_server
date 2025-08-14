const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const Chat = require("../models/Chat");
const Driver = require("../models/Driver");
const Trip = require("../models/Trip");
const Order = require("../models/Order");

router.get("/check-access/:otherUserId", protect, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const user = req.user;

    // Verify the other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Users can always chat with themselves (for notes, etc.)
    if (otherUserId === user._id.toString()) {
      return res.status(200).json({
        success: true,
        hasPermission: true,
      });
    }

    let hasPermission = false;

    // Check driver-client relationship
    if (user.role === "driver" || otherUser.role === "driver") {
      const driverUserId = user.role === "driver" ? user._id : otherUserId;
      const clientUserId = user.role === "driver" ? otherUserId : user._id;

      const driver = await Driver.findOne({ user: driverUserId });
      if (driver) {
        const trip = await Trip.findOne({
          client: clientUserId,
          driver: driver._id,
          status: { $nin: ["pending", "completed", "cancelled"] },
        });
        hasPermission = !!trip;
      }
    }

    // Check artisan-client relationship
    if (
      !hasPermission &&
      (user.role === "artisan" || otherUser.role === "artisan")
    ) {
      const artisanUserId = user.role === "artisan" ? user._id : otherUserId;
      const clientUserId = user.role === "artisan" ? otherUserId : user._id;

      const order = await Order.findOne({
        client: clientUserId,
        artisan: artisanUserId,
        status: "accepted",
      });
      hasPermission = !!order;
    }

    // For admin-to-user chats or other special cases
    if (!hasPermission && user.role === "admin") {
      hasPermission = true; // Admins can chat with anyone
    }

    return res.status(200).json({
      success: true,
      hasPermission,
    });
  } catch (error) {
    console.error("Error checking chat access:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
