const mongoose = require('mongoose');
const { requestStatuses } = require('../constants/enum');

const serviceRequestSchema = new mongoose.Schema({
  artisanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artisan', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceType: { type: String, required: true }, // e.g., "plumbing", "electrical"
  description: { type: String, required: true },
  location: {
    address: { type: String, required: true },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  status: { type: String, enum: requestStatuses, default: 'pending' },
  scheduledDate: { type: Date },
  priceEstimate: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);