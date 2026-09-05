const mongoose = require('mongoose');

const SHIPMENT_STATUSES = [
  'BOOKED',
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'FAILED',
];

const shipmentSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'customerId is required'],
    },
    pickupAddress: {
      type: String,
      required: [true, 'Pickup address is required'],
      trim: true,
    },
    dropAddress: {
      type: String,
      required: [true, 'Drop address is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: SHIPMENT_STATUSES,
      default: 'BOOKED',
    },
    assignedDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
    assignedVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [0.1, 'Weight must be at least 0.1 kg'],
    },
    distance: {
      type: Number,
      default: 0,
      min: 0,
    },
    shipmentType: {
      type: String,
      enum: ['STANDARD', 'EXPRESS', 'FRAGILE', 'BULK'],
      default: 'STANDARD',
    },
    deliveryProof: {
      receiverName: { type: String, default: null },
      confirmationNote: { type: String, default: null },
      timestamp: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

shipmentSchema.index({ customerId: 1 });
shipmentSchema.index({ assignedDriverId: 1 });
shipmentSchema.index({ status: 1 });

// Export statuses for reuse in controllers/validators
shipmentSchema.statics.STATUSES = SHIPMENT_STATUSES;

// Valid transitions map
shipmentSchema.statics.VALID_TRANSITIONS = {
  BOOKED: ['ASSIGNED', 'FAILED'],
  ASSIGNED: ['PICKED_UP', 'FAILED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  FAILED: [],
};

module.exports = mongoose.model('Shipment', shipmentSchema);
