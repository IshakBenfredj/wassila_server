const mongoose = require("mongoose");

const cancelledTripSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      required: true,
      default: "غير محدد",
      trim: true,
    },
  },
  { timestamps: true }
);

cancelledTripSchema.index({ trip: 1 });
cancelledTripSchema.index({ cancelledBy: 1 });

module.exports = mongoose.model("CancelledTrip", cancelledTripSchema);
