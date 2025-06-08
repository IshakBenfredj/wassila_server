const mongoose = require("mongoose");
const { artisanTypes } = require("../constants/enum");

const artisanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  profession: { type: String, enum: artisanTypes, required: true },
  experienceYears: { type: Number, default: 0 },
  hourlyRate: { type: Number, default: 0 },
  workLocations: [String],
});

module.exports = mongoose.model("Artisan", artisanSchema);
