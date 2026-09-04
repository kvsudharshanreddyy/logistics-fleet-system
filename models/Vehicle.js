const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Vehicle type is required'],
      trim: true,
      // e.g. 'TRUCK', 'VAN', 'BIKE', 'MINI_TRUCK'
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      // Capacity in kg
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ASSIGNED', 'INACTIVE'],
      default: 'AVAILABLE',
    },
    currentDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
  },
  { timestamps: true }
);

vehicleSchema.index({ currentDriverId: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
