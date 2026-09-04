const express = require('express');
const router = express.Router();
const { getFleetUtilization } = require('../controllers/reportController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken, authorizeRoles('ADMIN', 'DISPATCHER'));

router.get('/fleet-utilization', getFleetUtilization);

module.exports = router;
