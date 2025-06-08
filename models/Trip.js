const mongoose = require("mongoose");
const {
  transportTypes,
  vehicleTypes,
  requestStatuses,
} = require("../constants/enum");

const tripSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: function () {
        return this.status !== "pending";
      },
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startLocation: {
      name: { type: String, required: true },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v) => v.length === 2,
          message: "يجب أن تكون الإحداثيات [خط الطول، خط العرض]",
        },
      },
    },
    endLocation: {
      name: { type: String, required: true },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (v) => v.length === 2,
          message: "يجب أن تكون الإحداثيات [خط الطول، خط العرض]",
        },
      },
    },
    tripType: {
      type: String,
      enum: transportTypes,
      required: true,
    },
    vehicleType: {
      type: String,
      enum: vehicleTypes,
      required: true,
    },
    description: { type: String },
    status: { type: String, enum: requestStatuses, default: "pending" },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Trip", tripSchema);
