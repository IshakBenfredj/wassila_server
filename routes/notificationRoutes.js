// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { protect } = require("../middlewares/authMiddleware");

// Create a new notification
router.post("/", protect, async (req, res) => {
  try {
    const { userId, type, body, redirectId } = req.body;
    const fromUser = req.user;

    console.log("userId", userId);
    console.log("type", type);
    console.log("body", body);
    console.log("redirectId", redirectId);

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
      case "artisan_add_offer":
        title = "إضافة عرض من حرفي";
        break;
      case "artisan_order_requested":
        title = "طلب جديد من الحرفي";
        break;
      case "artisan_order_reject":
        title = "تم رفض الطلب من الحرفي";
        break;
      case "artisan_order_cancel":
        title = "تم إلغاء الطلب من الحرفي";
        break;
      case "client_order_cancel":
        title = "تم إلغاء الطلب من الزبون";
        break;
      case "end_order":
        title = "إنهاء عمل";
        break;
      case "driver_rated":
        title = "تم تقييمك من سائق";
        break;
      case "artisan_rated":
        title = "تم تقييمك من الحرفي";
        break;
      case "client_rated":
        title = "تم تقييمك من زبون";
        break;
      case "artisan_add_offer":
        title = "تم إضافة عرض لطلب العمل";
        break;
      case "accept_offer":
        title = "تم قبول عرضك";
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
      redirectId,
    });

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    console.error("❌ Notification creation error:", error);
    res.status(500).json({ success: false, message: "خطأ أثناء الإرسال" });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: 1 })
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
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "فشل التحديث" });
  }
});

// Mark all unread notifications as read and return them
router.put("/mark-all-read", protect, async (req, res) => {
  try {
    const unreadNotifications = await Notification.find({
      user: req.user._id,
      isRead: false,
    }).sort({ createdAt: -1 });

    if (unreadNotifications.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      data: unreadNotifications,
    });
  } catch (err) {
    console.error("❌ Mark all read error:", err);
    res.status(500).json({
      success: false,
      message: "فشل تحديث الإشعارات",
    });
  }
});

module.exports = router;
