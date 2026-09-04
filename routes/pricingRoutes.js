const express = require('express');
const router = express.Router();
const { getPricingEstimate } = require('../controllers/pricingController');
const validate = require('../middleware/validate');
const { pricingEstimateSchema } = require('../validators/shipmentValidator');

// Pricing estimate is accessible to authenticated users
const { authenticateToken } = require('../middleware/auth');

router.post('/estimate', authenticateToken, validate(pricingEstimateSchema), getPricingEstimate);

module.exports = router;
