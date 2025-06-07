const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  carType: {
    type: String,
    enum: ["car", "motorcycle", "small_truck", "large_truck"],
    required: true,
  },
  transportType: {
    type: String,
    enum: [
      "cargo",
      "food_delivery",
      "out_of_state",
      "interstate",
      "passenger",
      "school_transport",
      "corporate_transport",
      "tourist_transport",
      "medical_transport",
    ],
    required: true,
  },
  vehicleName: { type: String },
  licenseNumber: { type: String },
  issueDate: { type: Date },
  expiryDate: { type: Date },
  nationalId: { type: String },
});

module.exports = mongoose.model("Driver", driverSchema);
