const Trip = require('../models/Trip');
const Driver = require('../models/Driver');
const Shipment = require('../models/Shipment');

/**
 * POST /api/trips — Create a trip (Admin/Dispatcher)
 */
const createTrip = async (req, res, next) => {
  try {
    const { driverId, shipmentIds, date, notes } = req.body;

    // Validate driver
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found.',
        errorCode: 'NOT_FOUND',
      });
    }

    // Validate shipments and remove duplicates
    const uniqueIds = [...new Set(shipmentIds.map(String))];
    const shipments = await Shipment.find({ _id: { $in: uniqueIds } });

    if (shipments.length !== uniqueIds.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more shipment IDs are invalid.',
        errorCode: 'NOT_FOUND',
      });
    }

    // Validate all shipments belong to this driver (must be ASSIGNED to the driver)
    for (const s of shipments) {
      if (!s.assignedDriverId || s.assignedDriverId.toString() !== driverId) {
        return res.status(409).json({
          success: false,
          message: `Shipment ${s._id} is not assigned to driver ${driverId}.`,
          errorCode: 'SHIPMENT_DRIVER_MISMATCH',
        });
      }
    }

    const trip = await Trip.create({
      driverId,
      shipmentIds: uniqueIds,
      date: new Date(date),
      notes: notes || '',
    });

    const populated = await Trip.findById(trip._id)
      .populate({ path: 'driverId', populate: { path: 'userId', select: 'name email' } })
      .populate('shipmentIds', 'pickupAddress dropAddress status weight distance');

    res.status(201).json({
      success: true,
      message: 'Trip created.',
      data: { trip: populated },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/trips — List all trips
 */
const getTrips = async (req, res, next) => {
  try {
    let filter = {};

    // If driver, only see their own trips
    if (req.user.role === 'DRIVER') {
      const driver = await Driver.findOne({ userId: req.user.id });
      if (!driver) {
        return res.status(404).json({ success: false, message: 'Driver profile not found.', errorCode: 'NOT_FOUND' });
      }
      filter.driverId = driver._id;
    }

    const trips = await Trip.find(filter)
      .populate({ path: 'driverId', populate: { path: 'userId', select: 'name email' } })
      .populate('shipmentIds', 'pickupAddress dropAddress status weight distance')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      message: 'Trips fetched.',
      data: { trips, total: trips.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/trips/:id — Get single trip
 */
const getTripById = async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate({ path: 'driverId', populate: { path: 'userId', select: 'name email' } })
      .populate('shipmentIds', 'pickupAddress dropAddress status weight distance cost assignedVehicleId');

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.',
        errorCode: 'NOT_FOUND',
      });
    }

    // Ownership check for driver
    if (req.user.role === 'DRIVER') {
      const driver = await Driver.findOne({ userId: req.user.id });
      if (!driver || trip.driverId._id.toString() !== driver._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied.',
          errorCode: 'FORBIDDEN',
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Trip fetched.',
      data: { trip },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/trips/:id — Update trip (add/remove shipments, update notes)
 */
const updateTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.',
        errorCode: 'NOT_FOUND',
      });
    }

    const { shipmentIds, notes, date } = req.body;

    if (shipmentIds !== undefined) {
      // Validate new list
      const uniqueIds = [...new Set(shipmentIds.map(String))];
      const shipments = await Shipment.find({ _id: { $in: uniqueIds } });
      if (shipments.length !== uniqueIds.length) {
        return res.status(404).json({
          success: false,
          message: 'One or more shipment IDs are invalid.',
          errorCode: 'NOT_FOUND',
        });
      }
      for (const s of shipments) {
        if (!s.assignedDriverId || s.assignedDriverId.toString() !== trip.driverId.toString()) {
          return res.status(409).json({
            success: false,
            message: `Shipment ${s._id} is not assigned to this trip's driver.`,
            errorCode: 'SHIPMENT_DRIVER_MISMATCH',
          });
        }
      }
      trip.shipmentIds = uniqueIds;
    }

    if (notes !== undefined) trip.notes = notes;
    if (date !== undefined) trip.date = new Date(date);

    await trip.save();

    const populated = await Trip.findById(trip._id)
      .populate({ path: 'driverId', populate: { path: 'userId', select: 'name email' } })
      .populate('shipmentIds', 'pickupAddress dropAddress status weight distance');

    res.status(200).json({
      success: true,
      message: 'Trip updated.',
      data: { trip: populated },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createTrip, getTrips, getTripById, updateTrip };
