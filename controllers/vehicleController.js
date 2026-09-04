const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

/**
 * POST /api/vehicles — Create vehicle (Admin/Dispatcher)
 */
const createVehicle = async (req, res, next) => {
  try {
    const { type, capacity, status } = req.body;
    const vehicle = await Vehicle.create({ type, capacity, status: status || 'AVAILABLE' });
    res.status(201).json({
      success: true,
      message: 'Vehicle created.',
      data: { vehicle },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/vehicles — List all vehicles
 */
const getVehicles = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const vehicles = await Vehicle.find(filter).populate({
      path: 'currentDriverId',
      select: 'isAvailable',
      populate: { path: 'userId', select: 'name email' },
    });

    res.status(200).json({
      success: true,
      message: 'Vehicles fetched.',
      data: { vehicles, total: vehicles.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/vehicles/:id — Get single vehicle
 */
const getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate({
      path: 'currentDriverId',
      select: 'isAvailable',
      populate: { path: 'userId', select: 'name email' },
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
        errorCode: 'NOT_FOUND',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle fetched.',
      data: { vehicle },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/vehicles/:id — Update vehicle (Admin/Dispatcher)
 */
const updateVehicle = async (req, res, next) => {
  try {
    // Do not allow directly setting currentDriverId via this endpoint
    const { type, capacity, status } = req.body;
    const update = {};
    if (type !== undefined) update.type = type;
    if (capacity !== undefined) update.capacity = capacity;
    if (status !== undefined) update.status = status;

    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
        errorCode: 'NOT_FOUND',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle updated.',
      data: { vehicle },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/vehicles/:id — Deactivate vehicle (Admin/Dispatcher)
 * Soft-delete: sets status to INACTIVE
 */
const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found.',
        errorCode: 'NOT_FOUND',
      });
    }

    if (vehicle.status === 'ASSIGNED') {
      return res.status(409).json({
        success: false,
        message: 'Cannot deactivate a vehicle that is currently ASSIGNED.',
        errorCode: 'VEHICLE_ASSIGNED',
      });
    }

    vehicle.status = 'INACTIVE';
    await vehicle.save();

    // Remove from driver if linked
    if (vehicle.currentDriverId) {
      await Driver.findByIdAndUpdate(vehicle.currentDriverId, { vehicleId: null });
      vehicle.currentDriverId = null;
      await vehicle.save();
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle deactivated.',
      data: { vehicle },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createVehicle, getVehicles, getVehicleById, updateVehicle, deleteVehicle };
