const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: [true, 'driverId is required'],
    },
    shipmentIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Shipment',
        },
      ],
      required: [true, 'shipmentIds is required'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Trip must contain at least one shipment',
      },
    },
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
