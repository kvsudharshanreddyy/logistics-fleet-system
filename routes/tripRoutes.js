const express = require('express');
const router = express.Router();
const { createTrip, getTrips, getTripById, updateTrip } = require('../controllers/tripController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const Joi = require('joi');
const validate = require('../middleware/validate');

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);

const createTripSchema = Joi.object({
  driverId: objectId.required(),
  shipmentIds: Joi.array().items(objectId).min(1).required(),
  date: Joi.date().required(),
  notes: Joi.string().max(500).optional().allow(''),
});

const updateTripSchema = Joi.object({
  shipmentIds: Joi.array().items(objectId).min(1).optional(),
  date: Joi.date().optional(),
  notes: Joi.string().max(500).optional().allow(''),
}).min(1);

router.use(authenticateToken);

router.post('/', authorizeRoles('ADMIN', 'DISPATCHER'), validate(createTripSchema), createTrip);
router.get('/', authorizeRoles('ADMIN', 'DISPATCHER', 'DRIVER'), getTrips);
router.get('/:id', authorizeRoles('ADMIN', 'DISPATCHER', 'DRIVER'), getTripById);
router.put('/:id', authorizeRoles('ADMIN', 'DISPATCHER'), validate(updateTripSchema), updateTrip);

module.exports = router;
