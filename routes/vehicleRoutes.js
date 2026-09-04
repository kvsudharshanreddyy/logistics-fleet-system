const express = require('express');
const router = express.Router();
const {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} = require('../controllers/vehicleController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createVehicleSchema, updateVehicleSchema } = require('../validators/vehicleValidator');

// All vehicle routes require authentication + Admin or Dispatcher role
router.use(authenticateToken, authorizeRoles('ADMIN', 'DISPATCHER'));

router.post('/', validate(createVehicleSchema), createVehicle);
router.get('/', getVehicles);
router.get('/:id', getVehicleById);
router.put('/:id', validate(updateVehicleSchema), updateVehicle);
router.delete('/:id', deleteVehicle);

module.exports = router;
