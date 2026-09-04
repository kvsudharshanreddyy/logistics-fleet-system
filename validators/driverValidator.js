const Joi = require('joi');

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': 'Must be a valid MongoDB ObjectId',
});

const createDriverSchema = Joi.object({
  userId: objectId.required(),
  vehicleId: objectId.optional().allow(null, ''),
  isAvailable: Joi.boolean().optional(),
  licenseNumber: Joi.string().max(50).optional().allow(''),
  phone: Joi.string().max(20).optional().allow(''),
});

const updateDriverSchema = Joi.object({
  vehicleId: objectId.optional().allow(null, ''),
  isAvailable: Joi.boolean().optional(),
  licenseNumber: Joi.string().max(50).optional().allow(''),
  phone: Joi.string().max(20).optional().allow(''),
}).min(1);

module.exports = { createDriverSchema, updateDriverSchema };
