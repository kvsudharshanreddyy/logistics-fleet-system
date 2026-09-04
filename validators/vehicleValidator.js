const Joi = require('joi');

const createVehicleSchema = Joi.object({
  type: Joi.string().valid('TRUCK', 'VAN', 'BIKE', 'MINI_TRUCK').required(),
  capacity: Joi.number().min(1).required().messages({
    'number.min': 'Capacity must be at least 1 kg',
  }),
  status: Joi.string().valid('AVAILABLE', 'ASSIGNED', 'INACTIVE').optional(),
});

const updateVehicleSchema = Joi.object({
  type: Joi.string().valid('TRUCK', 'VAN', 'BIKE', 'MINI_TRUCK').optional(),
  capacity: Joi.number().min(1).optional(),
  status: Joi.string().valid('AVAILABLE', 'ASSIGNED', 'INACTIVE').optional(),
}).min(1);

module.exports = { createVehicleSchema, updateVehicleSchema };
