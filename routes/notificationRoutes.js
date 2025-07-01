// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { protect } = require("../middlewares/authMiddleware");

// Create a new notification
router.post("/", protect, async (req, res) => {
  try {
    const { userId, type, body } = req.body;
    const fromUser = req.user;

    let title = "";

    switch (type) {
      case "trip_requested":
        title = "طلب رحلة جديد";
        break;
      case "trip_accepted":
        title = "تم قبول الرحلة";
        break;
      case "trip_status_changed":
        title = "تغيير حالة الرحلة";
        break;
      case "artisan_order_requested":
        title = "طلب جديد من الحرفي";
        break;
      case "artisan_order_accepted":
        title = "تم قبول الطلب من الحرفي";
        break;
      case "driver_rated_client":
        title = "تم تقييمك من السائق";
        break;
      case "client_rated_driver":
        title = "تم تقييم السائق";
        break;
      case "artisan_rated_client":
        title = "تم تقييمك من الحرفي";
        break;
      case "client_rated_artisan":
        title = "تم تقييم الحرفي";
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "نوع الإشعار غير مدعوم.",
        });
    }

    const notification = await Notification.create({
      user: userId,
      fromUser: fromUser._id,
      isRead: false,
      type,
      title,
      body,
    });

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    console.error("❌ Notification creation error:", error);
    res.status(500).json({ success: false, message: "خطأ أثناء الإرسال" });
  }
});

// Get notifications for logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json({ message: "فشل في جلب الإشعارات" });
  }
});

// Mark notification as read
router.put("/:id/read", protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true, message: "تم التحديث" });
  } catch (err) {
    res.status(500).json({ message: "فشل التحديث" });
  }
});

module.exports = router;
