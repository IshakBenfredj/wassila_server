const mongoose = require("mongoose");
const { artisanTypes } = require("../constants/enum");

const artisanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  professions: [{ type: String, enum: artisanTypes, required: true }],
  wilayat: [{ type: String, required: true }],
  startYear: { type: Number, default: 0 },
});

module.exports = mongoose.model("Artisan", artisanSchema);
