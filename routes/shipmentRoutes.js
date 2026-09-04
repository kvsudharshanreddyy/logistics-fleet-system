const express = require('express');
const router = express.Router();
const {
  createShipment,
  getShipments,
  getShipmentById,
  assignShipment,
  updateShipmentStatus,
  trackShipment,
  addDeliveryProof,
} = require('../controllers/shipmentController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createShipmentSchema,
  assignShipmentSchema,
  updateStatusSchema,
  deliveryProofSchema,
} = require('../validators/shipmentValidator');

router.use(authenticateToken);

// Customer creates shipment
router.post('/', authorizeRoles('CUSTOMER'), validate(createShipmentSchema), createShipment);

// All authenticated roles can list (filtered by role in controller)
router.get('/', authorizeRoles('CUSTOMER', 'DRIVER', 'ADMIN', 'DISPATCHER'), getShipments);

// Single shipment — role-filtered in controller
router.get(
  '/:id',
  authorizeRoles('CUSTOMER', 'DRIVER', 'ADMIN', 'DISPATCHER'),
  getShipmentById
);

// Tracking — customer + admin
router.get(
  '/:id/track',
  authorizeRoles('CUSTOMER', 'ADMIN', 'DISPATCHER'),
  trackShipment
);

// Dispatch assignment — Admin/Dispatcher only
router.put(
  '/:id/assign',
  authorizeRoles('ADMIN', 'DISPATCHER'),
  validate(assignShipmentSchema),
  assignShipment
);

// Status update — Driver (and Admin/Dispatcher for overrides)
router.put(
  '/:id/status',
  authorizeRoles('DRIVER', 'ADMIN', 'DISPATCHER'),
  validate(updateStatusSchema),
  updateShipmentStatus
);

// Delivery proof — Driver + Admin/Dispatcher
router.post(
  '/:id/delivery-proof',
  authorizeRoles('DRIVER', 'ADMIN', 'DISPATCHER'),
  validate(deliveryProofSchema),
  addDeliveryProof
);

module.exports = router;
