const mongoose = require("mongoose");
const { Schema } = mongoose;

const reviewSchema = new Schema(
  {
    stars: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} ليس قيمة صحيحة",
      },
    },
    order: {
      type: String,
      ref: "Order",
    },
    trip: {
      type: String,
      ref: "Trip",
    },
    reviewText: {
      type: String,
      required: false,
    },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index(
  { reviewer: 1, reviewedUser: 1, trip: 1 },
  { unique: true, partialFilterExpression: { trip: { $exists: true } } }
);
reviewSchema.index(
  { reviewer: 1, reviewedUser: 1, order: 1 },
  { unique: true, partialFilterExpression: { order: { $exists: true } } }
);

reviewSchema.pre("validate", function (next) {
  if (this.reviewer.equals(this.reviewedUser)) {
    this.invalidate("reviewer", "لا يمكنك تقييم نفسك");
  }
  next();
});

module.exports = mongoose.model("Review", reviewSchema);
