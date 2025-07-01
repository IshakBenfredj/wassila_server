const mongoose = require("mongoose");

const notificationTypes = [
  "trip_requested",
  "trip_accepted",
  "trip_status_changed",
  "artisan_order_requested",
  "artisan_order_accepted",
  "driver_rated_client",
  "client_rated_driver",
  "artisan_rated_client",
  "client_rated_artisan",
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
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
