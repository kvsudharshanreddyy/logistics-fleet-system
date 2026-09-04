const { calculatePrice } = require('../utils/pricing');

/**
 * POST /api/pricing/estimate — Public pricing estimate endpoint
 */
const getPricingEstimate = async (req, res, next) => {
  try {
    const { distance, weight, shipmentType } = req.body;

    const pricing = calculatePrice(distance, weight, shipmentType || 'STANDARD');

    res.status(200).json({
      success: true,
      message: 'Pricing estimate calculated.',
      data: { pricing },
    });
  } catch (err) {
    if (err.message.includes('positive')) {
      return res.status(400).json({
        success: false,
        message: err.message,
        errorCode: 'VALIDATION_ERROR',
      });
    }
    next(err);
  }
};

module.exports = { getPricingEstimate };
