const mongoose = require("mongoose");
const User = require("./User");

const artisanTypes = [
  "electrician",
  "plumber",
  "carpenter",
  "builder",
  "painter",
  "tiler",
  "blacksmith",
  "contractor",
  "aluminum_technician",
  "glass_technician",
  "auto_mechanic",
  "diesel_mechanic",
  "ac_technician",
  "refrigeration_tech",
  "brake_technician",
  "appliance_tech",
  "tank_cleaner",
  "pest_control",
  "carpet_cleaner",
  "satellite_tech",
  "computer_tech",
  "network_tech",
  "cctv_tech",
  "audio_tech",
  "barber",
  "hairstylist",
  "tailor",
  "calligrapher",
  "decorator",
  "medical_equipment_tech",
  "elevator_tech",
  "solar_panel_installer",
  "safety_technician"
];

const artisanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  profession: { type: String, enum: artisanTypes, required: true },
  experienceYears: { type: Number, default: 0 },
  hourlyRate: { type: Number, default: 0 },
  workLocations: [String],
});

module.exports = mongoose.model("Artisan", artisanSchema);
