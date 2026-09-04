const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  shipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment',
    required: [true, 'shipmentId is required'],
  },
  status: {
    type: String,
    required: [true, 'status is required'],
    enum: ['BOOKED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED'],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  note: {
    type: String,
    default: '',
  },
  locationText: {
    type: String,
    default: '',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
});

statusHistorySchema.index({ shipmentId: 1 });
statusHistorySchema.index({ shipmentId: 1, timestamp: 1 });

module.exports = mongoose.model('StatusHistory', statusHistorySchema);
