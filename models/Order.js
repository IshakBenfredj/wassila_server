const mongoose = require("mongoose");

const CancellationSchema = new mongoose.Schema({
  reason: { type: String, required: true },
  cancelledBy: { type: String, enum: ["artisan", "client"], required: true },
  type: { type: String, enum: ["rejected", "canceled"], required: true },
  date: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    artisan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    professions: [
      {
        type: String,
        required: true,
      },
    ],
    wilaya: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    maxPrice: {
      type: Number,
      min: 0,
      default: null,
    },
    images: [
      {
        type: String,
        default: [],
      },
    ],
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed", "canceled"],
      default: "pending",
    },
    cancellation: CancellationSchema,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  }
);

orderSchema.index({ client: 1 });
orderSchema.index({ artisan: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ professions: 1 });
orderSchema.index({ wilaya: 1 });
orderSchema.index({ createdAt: -1 });

orderSchema.virtual("formattedDate").get(function () {
  return this.createdAt.toLocaleDateString("ar-DZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
});

orderSchema.pre("save", function (next) {
  if (this.maxPrice && this.maxPrice < 0) {
    throw new Error("السعر الأقصى يجب أن يكون رقمًا موجبًا");
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
