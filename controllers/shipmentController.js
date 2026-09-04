const Shipment = require('../models/Shipment');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const StatusHistory = require('../models/StatusHistory');
const { calculatePrice } = require('../utils/pricing');

// Helper to record status history
const recordStatusHistory = async (shipmentId, status, note, locationText, updatedBy) => {
  await StatusHistory.create({
    shipmentId,
    status,
    note: note || '',
    locationText: locationText || '',
    timestamp: new Date(),
    updatedBy: updatedBy || null,
  });
};

/**
 * POST /api/shipments — Customer creates a shipment
 */
const createShipment = async (req, res, next) => {
  try {
    const { pickupAddress, dropAddress, weight, distance, shipmentType } = req.body;

    // Calculate cost using pricing engine
    const pricing = calculatePrice(distance, weight, shipmentType || 'STANDARD');

    const shipment = await Shipment.create({
      customerId: req.user.id,
      pickupAddress,
      dropAddress,
      weight,
      distance,
      shipmentType: shipmentType || 'STANDARD',
      status: 'BOOKED',
      cost: pricing.totalCost,
    });

    // Record initial status history
    await recordStatusHistory(shipment._id, 'BOOKED', 'Shipment booked by customer.', '', req.user.id);

    res.status(201).json({
      success: true,
      message: 'Shipment created.',
      data: { shipment, pricingBreakdown: pricing },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/shipments — List shipments
 * Customers see only their own; Admin/Dispatcher see all; Driver sees assigned
 */
const getShipments = async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role === 'CUSTOMER') {
      filter.customerId = req.user.id;
    } else if (req.user.role === 'DRIVER') {
      // Find driver profile
      const driver = await Driver.findOne({ userId: req.user.id });
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'Driver profile not found.',
          errorCode: 'NOT_FOUND',
        });
      }
      filter.assignedDriverId = driver._id;
    }
    // Admin/Dispatcher: no filter

    if (req.query.status) filter.status = req.query.status;

    const shipments = await Shipment.find(filter)
      .populate('customerId', 'name email')
      .populate({
        path: 'assignedDriverId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('assignedVehicleId', 'type capacity status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Shipments fetched.',
      data: { shipments, total: shipments.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/shipments/:id — Get shipment by ID
 */
const getShipmentById = async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate('customerId', 'name email')
      .populate({
        path: 'assignedDriverId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('assignedVehicleId', 'type capacity status');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found.',
        errorCode: 'NOT_FOUND',
      });
    }

    // Ownership check for customer
    if (req.user.role === 'CUSTOMER') {
      if (shipment.customerId._id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This is not your shipment.',
          errorCode: 'FORBIDDEN',
        });
      }
    }

    // Driver can only see their assigned shipment
    if (req.user.role === 'DRIVER') {
      const driver = await Driver.findOne({ userId: req.user.id });
      if (!driver || !shipment.assignedDriverId ||
          shipment.assignedDriverId._id.toString() !== driver._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This shipment is not assigned to you.',
          errorCode: 'FORBIDDEN',
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Shipment fetched.',
      data: { shipment },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/shipments/:id/assign — Dispatcher assigns driver + vehicle to shipment
 */
const assignShipment = async (req, res, next) => {
  try {
    const { driverId, vehicleId } = req.body;

    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found.',
        errorCode: 'NOT_FOUND',
      });
    }

    // Shipment must be in BOOKED status to be assigned
    if (shipment.status !== 'BOOKED') {
      return res.status(409).json({
        success: false,
        message: `Shipment cannot be assigned from status "${shipment.status}". Only BOOKED shipments can be assigned.`,
        errorCode: 'INVALID_STATUS_TRANSITION',
      });
    }

    // Validate driver
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found.',
        errorCode: 'NOT_FOUND',
      });
    }
    if (!driver.isAvailable) {
      return res.status(409).json({
        success: false,
        message: 'Driver is not available.',
        errorCode: 'DRIVER_UNAVAILABLE',
      });
    }

    // Validate vehicle
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
        errorCode: 'NOT_FOUND',
      });
    }
    if (vehicle.status !== 'AVAILABLE') {
      return res.status(409).json({
        success: false,
        message: `Vehicle is "${vehicle.status}" and cannot be assigned.`,
        errorCode: 'VEHICLE_UNAVAILABLE',
      });
    }

    // Check vehicle capacity vs shipment weight
    if (vehicle.capacity < shipment.weight) {
      return res.status(409).json({
        success: false,
        message: `Vehicle capacity (${vehicle.capacity}kg) is less than shipment weight (${shipment.weight}kg).`,
        errorCode: 'CAPACITY_EXCEEDED',
      });
    }

    // Perform assignment
    shipment.assignedDriverId = driverId;
    shipment.assignedVehicleId = vehicleId;
    shipment.status = 'ASSIGNED';
    await shipment.save();

    // Mark driver as unavailable
    driver.isAvailable = false;
    driver.vehicleId = vehicleId;
    await driver.save();

    // Mark vehicle as assigned
    vehicle.status = 'ASSIGNED';
    vehicle.currentDriverId = driver._id;
    await vehicle.save();

    // Record status history
    await recordStatusHistory(
      shipment._id,
      'ASSIGNED',
      `Assigned to driver ${driverId} with vehicle ${vehicleId}.`,
      '',
      req.user.id
    );

    const updated = await Shipment.findById(shipment._id)
      .populate('customerId', 'name email')
      .populate({ path: 'assignedDriverId', populate: { path: 'userId', select: 'name email' } })
      .populate('assignedVehicleId', 'type capacity status');

    res.status(200).json({
      success: true,
      message: 'Shipment assigned successfully.',
      data: { shipment: updated },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/shipments/:id/status — Driver updates shipment status
 */
const updateShipmentStatus = async (req, res, next) => {
  try {
    const { status, note, locationText } = req.body;

    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found.',
        errorCode: 'NOT_FOUND',
      });
    }

    // Driver must be the assigned driver
    if (req.user.role === 'DRIVER') {
      const driver = await Driver.findOne({ userId: req.user.id });
      if (!driver || !shipment.assignedDriverId ||
          shipment.assignedDriverId.toString() !== driver._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not the assigned driver for this shipment.',
          errorCode: 'FORBIDDEN',
        });
      }
    }

    // Validate status transition
    const validNextStatuses = Shipment.VALID_TRANSITIONS[shipment.status];
    if (!validNextStatuses || !validNextStatuses.includes(status)) {
      return res.status(409).json({
        success: false,
        message: `Invalid status transition: "${shipment.status}" → "${status}". Allowed: ${validNextStatuses ? validNextStatuses.join(', ') : 'none'}.`,
        errorCode: 'INVALID_STATUS_TRANSITION',
      });
    }

    shipment.status = status;
    await shipment.save();

    // Record status history
    await recordStatusHistory(shipment._id, status, note, locationText, req.user.id);

    // If DELIVERED or FAILED, free driver and vehicle
    if (status === 'DELIVERED' || status === 'FAILED') {
      if (shipment.assignedDriverId) {
        await Driver.findByIdAndUpdate(shipment.assignedDriverId, { isAvailable: true });
      }
      if (shipment.assignedVehicleId) {
        await Vehicle.findByIdAndUpdate(shipment.assignedVehicleId, {
          status: 'AVAILABLE',
          currentDriverId: null,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Shipment status updated to "${status}".`,
      data: { shipment },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/shipments/:id/track — Customer tracks their own shipment
 */
const trackShipment = async (req, res, next) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate('customerId', 'name email')
      .populate({
        path: 'assignedDriverId',
        select: 'isAvailable',
        populate: { path: 'userId', select: 'name' },
      })
      .populate('assignedVehicleId', 'type capacity');

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found.',
        errorCode: 'NOT_FOUND',
      });
    }

    // Ownership check — customer cannot track others' shipments
    if (req.user.role === 'CUSTOMER') {
      if (shipment.customerId._id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only track your own shipments.',
          errorCode: 'FORBIDDEN',
        });
      }
    }

    // Get status history ordered by timestamp
    const statusHistory = await StatusHistory.find({ shipmentId: shipment._id })
      .sort({ timestamp: 1 });

    res.status(200).json({
      success: true,
      message: 'Shipment tracking info.',
      data: {
        shipment: {
          id: shipment._id,
          status: shipment.status,
          pickupAddress: shipment.pickupAddress,
          dropAddress: shipment.dropAddress,
          shipmentType: shipment.shipmentType,
          weight: shipment.weight,
          distance: shipment.distance,
          cost: shipment.cost,
          assignedDriver: shipment.assignedDriverId,
          assignedVehicle: shipment.assignedVehicleId,
          deliveryProof: shipment.deliveryProof,
          createdAt: shipment.createdAt,
          updatedAt: shipment.updatedAt,
        },
        statusHistory,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/shipments/:id/delivery-proof — Driver adds delivery proof
 */
const addDeliveryProof = async (req, res, next) => {
  try {
    const { receiverName, confirmationNote } = req.body;

    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found.',
        errorCode: 'NOT_FOUND',
      });
    }

    // Only assigned driver or admin can add proof
    if (req.user.role === 'DRIVER') {
      const driver = await Driver.findOne({ userId: req.user.id });
      if (!driver || !shipment.assignedDriverId ||
          shipment.assignedDriverId.toString() !== driver._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not the assigned driver for this shipment.',
          errorCode: 'FORBIDDEN',
        });
      }
    }

    // Shipment must be DELIVERED to add proof
    if (shipment.status !== 'DELIVERED') {
      return res.status(409).json({
        success: false,
        message: 'Delivery proof can only be added for DELIVERED shipments.',
        errorCode: 'INVALID_STATUS',
      });
    }

    shipment.deliveryProof = {
      receiverName,
      confirmationNote: confirmationNote || '',
      timestamp: new Date(),
    };
    await shipment.save();

    res.status(200).json({
      success: true,
      message: 'Delivery proof added.',
      data: { shipment },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createShipment,
  getShipments,
  getShipmentById,
  assignShipment,
  updateShipmentStatus,
  trackShipment,
  addDeliveryProof,
};
