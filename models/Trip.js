const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startLocation: {
    name: { type: String, required: true },
    coordinates: { type: [Number], required: true }
  },
  endLocation: {
    name: { type: String, required: true },
    coordinates: { type: [Number], required: true }
  },
  tripType: { type: String, enum: ['delivery', 'ride'], required: true },
  description: { type: String },
  status: { type: String, enum: ['pending', 'active', 'completed', 'cancelled'], default: 'pending' },
  startTime: { type: Date },
  endTime: { type: Date },
  price: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);