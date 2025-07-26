const mongoose = require("mongoose");

const notificationTypes = [
  "trip_requested",
  "trip_accepted",
  "trip_status_changed",
  "artisan_order_requested",
  "artisan_add_offer",
  "accept_offer",
  "artisan_order_reject",
  "artisan_order_cancel",
  "end_order",
  "client_order_cancel",
  "driver_rated",
  "client_rated",
  "artisan_rated",
];

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    title: String,
    body: String,
    type: {
      type: String,
      enum: notificationTypes,
    },
    redirectId: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
