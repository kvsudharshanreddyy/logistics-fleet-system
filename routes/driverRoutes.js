const express = require('express');
const router = express.Router();
const {
  createDriver,
  getDrivers,
  getDriverById,
  getMyDriverProfile,
  updateDriver,
} = require('../controllers/driverController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createDriverSchema, updateDriverSchema } = require('../validators/driverValidator');

router.use(authenticateToken);

// Driver can get their own profile
router.get('/me', authorizeRoles('DRIVER'), getMyDriverProfile);

// Admin/Dispatcher only
router.post('/', authorizeRoles('ADMIN', 'DISPATCHER'), validate(createDriverSchema), createDriver);
router.get('/', authorizeRoles('ADMIN', 'DISPATCHER'), getDrivers);
router.put('/:id', authorizeRoles('ADMIN', 'DISPATCHER'), validate(updateDriverSchema), updateDriver);

// Driver can view their own profile by id; Admin/Dispatcher can view any
router.get('/:id', authorizeRoles('ADMIN', 'DISPATCHER', 'DRIVER'), getDriverById);

module.exports = router;
