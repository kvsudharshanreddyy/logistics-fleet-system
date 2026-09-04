const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(6)
    .max(72)
    .required()
    .messages({ 'string.min': 'Password must be at least 6 characters' }),
  role: Joi.string().valid('CUSTOMER', 'DRIVER').required().messages({
    'any.only': 'Role must be CUSTOMER or DRIVER (ADMIN/DISPATCHER are seeded)',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
