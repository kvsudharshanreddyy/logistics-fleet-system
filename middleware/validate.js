/**
 * Validation middleware factory.
 * Takes a Joi schema and validates req.body against it.
 * Returns 400 with VALIDATION_ERROR on failure.
 */
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message).join(', ');
    return res.status(400).json({
      success: false,
      message: messages,
      errorCode: 'VALIDATION_ERROR',
    });
  }
  next();
};

module.exports = validate;
