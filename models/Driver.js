const mongoose = require("mongoose");
const { transportTypes, vehicleTypes } = require("../constants/enum");

const driverSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  vehicleType: {
    type: String,
    enum: vehicleTypes,
    required: true,
  },
  transportType: [
    {
      type: String,
      enum: transportTypes,
      required: true,
    },
  ],
  vehicleName: { type: String, required: true },
  licenseNumber: { type: String, required: true },
  issueDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  placesNumber: { type: String, required: true },
  isAvailable: { type: Boolean, default: false },
});

module.exports = mongoose.model("Driver", driverSchema);
