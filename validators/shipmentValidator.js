const Joi = require('joi');

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': 'Must be a valid MongoDB ObjectId',
});

const createShipmentSchema = Joi.object({
  pickupAddress: Joi.string().min(5).max(300).required(),
  dropAddress: Joi.string().min(5).max(300).required(),
  weight: Joi.number().min(0.1).required().messages({
    'number.min': 'Weight must be at least 0.1 kg',
  }),
  distance: Joi.number().min(0.1).required().messages({
    'number.min': 'Distance must be at least 0.1 km',
  }),
  shipmentType: Joi.string().valid('STANDARD', 'EXPRESS', 'FRAGILE', 'BULK').optional(),
});

const assignShipmentSchema = Joi.object({
  driverId: objectId.required(),
  vehicleId: objectId.required(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED')
    .required(),
  note: Joi.string().max(500).optional().allow(''),
  locationText: Joi.string().max(300).optional().allow(''),
});

const deliveryProofSchema = Joi.object({
  receiverName: Joi.string().min(2).max(100).required(),
  confirmationNote: Joi.string().max(500).optional().allow(''),
});

const pricingEstimateSchema = Joi.object({
  distance: Joi.number().min(0.1).required(),
  weight: Joi.number().min(0.1).required(),
  shipmentType: Joi.string().valid('STANDARD', 'EXPRESS', 'FRAGILE', 'BULK').optional(),
});

module.exports = {
  createShipmentSchema,
  assignShipmentSchema,
  updateStatusSchema,
  deliveryProofSchema,
  pricingEstimateSchema,
};
