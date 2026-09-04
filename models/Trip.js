const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: [true, 'driverId is required'],
    },
    shipmentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shipment',
      },
    ],
    date: {
      type: Date,
      required: [true, 'Trip date is required'],
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

tripSchema.index({ driverId: 1 });
tripSchema.index({ date: 1 });

module.exports = mongoose.model('Trip', tripSchema);
