const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const Chat = require("../models/Chat");
const Driver = require("../models/Driver");
const Trip = require("../models/Trip");
const Order = require("../models/Order");

router.get("/check-access/:chatId", protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    const user = req.user;

    // Find chat and verify user is a participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: { $in: [user._id] },
    }).populate("participants");

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found or access denied",
      });
    }

    // Find the other participant
    const otherParticipant = chat.participants.find(
      (participant) => participant._id.toString() !== user._id.toString()
    );

    if (!otherParticipant) {
      return res.status(400).json({
        success: false,
        message: "Invalid chat configuration",
      });
    }

    let hasPermission = false;

    // Check driver-client relationship
    if (user.role === "driver" || otherParticipant.role === "driver") {
      const driverUserId = user.role === "driver" ? user._id : otherParticipant._id;
      const clientUserId = user.role === "driver" ? otherParticipant._id : user._id;

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
    if (!hasPermission && (user.role === "artisan" || otherParticipant.role === "artisan")) {
      const artisanUserId = user.role === "artisan" ? user._id : otherParticipant._id;
      const clientUserId = user.role === "artisan" ? otherParticipant._id : user._id;

      const order = await Order.findOne({
        client: clientUserId,
        artisan: artisanUserId,
        status: "accepted",
      });
      console.log('order', order)
      hasPermission = !!order;
    }

    // For admin-to-user chats or other special cases
    if (!hasPermission && user.role === "admin") {
      hasPermission = true; // Admins can chat with anyone
    }

    return res.status(200).json({
      success: true,
      hasPermission
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