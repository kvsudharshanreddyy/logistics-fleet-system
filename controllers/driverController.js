const Driver = require('../models/Driver');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');

/**
 * POST /api/drivers — Create driver profile (Admin/Dispatcher)
 */
const createDriver = async (req, res, next) => {
  try {
    const { userId, vehicleId, isAvailable, licenseNumber, phone } = req.body;

    // Verify user exists and has DRIVER role
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        errorCode: 'NOT_FOUND',
      });
    }
    if (user.role !== 'DRIVER') {
      return res.status(400).json({
        success: false,
        message: 'User must have the DRIVER role to create a driver profile.',
        errorCode: 'ROLE_MISMATCH',
      });
    }

    // Check driver profile doesn't already exist
    const existing = await Driver.findOne({ userId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Driver profile already exists for this user.',
        errorCode: 'DUPLICATE_KEY',
      });
    }

    // Validate vehicle if provided
    if (vehicleId) {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found.',
          errorCode: 'NOT_FOUND',
        });
      }
      if (vehicle.status === 'INACTIVE') {
        return res.status(409).json({
          success: false,
          message: 'Cannot assign an INACTIVE vehicle to a driver.',
          errorCode: 'VEHICLE_INACTIVE',
        });
      }
    }

    const driver = await Driver.create({
      userId,
      vehicleId: vehicleId || null,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      licenseNumber: licenseNumber || '',
      phone: phone || '',
    });

    // If vehicle assigned, link the driver to the vehicle
    if (vehicleId) {
      await Vehicle.findByIdAndUpdate(vehicleId, {
        currentDriverId: driver._id,
        status: 'ASSIGNED',
      });
    }

    const populated = await Driver.findById(driver._id)
      .populate('userId', 'name email role')
      .populate('vehicleId', 'type capacity status');

    res.status(201).json({
      success: true,
      message: 'Driver profile created.',
      data: { driver: populated },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/drivers — List all drivers (Admin/Dispatcher)
 */
const getDrivers = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.isAvailable !== undefined) {
      filter.isAvailable = req.query.isAvailable === 'true';
    }

    const drivers = await Driver.find(filter)
      .populate('userId', 'name email role')
      .populate('vehicleId', 'type capacity status');

    res.status(200).json({
      success: true,
      message: 'Drivers fetched.',
      data: { drivers, total: drivers.length },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/drivers/:id — Get single driver profile
 * Drivers can only access their own profile; admin/dispatcher can access all
 */
const getDriverById = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.params.id)
      .populate('userId', 'name email role')
      .populate('vehicleId', 'type capacity status');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found.',
        errorCode: 'NOT_FOUND',
      });
    }

    // If DRIVER role, ensure they can only see their own profile
    if (req.user.role === 'DRIVER') {
      if (driver.userId._id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own driver profile.',
          errorCode: 'FORBIDDEN',
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Driver fetched.',
      data: { driver },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/drivers/me — Driver gets their own profile by JWT
 */
const getMyDriverProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: req.user.id })
      .populate('userId', 'name email role')
      .populate('vehicleId', 'type capacity status');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found. Contact admin to create one.',
        errorCode: 'NOT_FOUND',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Driver profile fetched.',
      data: { driver },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/drivers/:id — Update driver profile (Admin/Dispatcher)
 */
const updateDriver = async (req, res, next) => {
  try {
    const { vehicleId, isAvailable, licenseNumber, phone } = req.body;

    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found.',
        errorCode: 'NOT_FOUND',
      });
    }

    // Handle vehicle assignment change
    if (vehicleId !== undefined) {
      if (vehicleId === null || vehicleId === '') {
        // Remove vehicle assignment
        if (driver.vehicleId) {
          // Set old vehicle back to AVAILABLE
          await Vehicle.findByIdAndUpdate(driver.vehicleId, {
            status: 'AVAILABLE',
            currentDriverId: null,
          });
        }
        driver.vehicleId = null;
      } else {
        // Assign new vehicle
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle) {
          return res.status(404).json({
            success: false,
            message: 'Vehicle not found.',
            errorCode: 'NOT_FOUND',
          });
        }
        if (vehicle.status === 'INACTIVE') {
          return res.status(409).json({
            success: false,
            message: 'Cannot assign an INACTIVE vehicle.',
            errorCode: 'VEHICLE_INACTIVE',
          });
        }
        if (vehicle.status === 'ASSIGNED' && String(vehicle.currentDriverId) !== String(driver._id)) {
          return res.status(409).json({
            success: false,
            message: 'Vehicle is already ASSIGNED to another driver.',
            errorCode: 'VEHICLE_UNAVAILABLE',
          });
        }

        // Free old vehicle
        if (driver.vehicleId && String(driver.vehicleId) !== vehicleId) {
          await Vehicle.findByIdAndUpdate(driver.vehicleId, {
            status: 'AVAILABLE',
            currentDriverId: null,
          });
        }

        await Vehicle.findByIdAndUpdate(vehicleId, {
          status: 'ASSIGNED',
          currentDriverId: driver._id,
        });
        driver.vehicleId = vehicleId;
      }
    }

    if (isAvailable !== undefined) driver.isAvailable = isAvailable;
    if (licenseNumber !== undefined) driver.licenseNumber = licenseNumber;
    if (phone !== undefined) driver.phone = phone;

    await driver.save();

    const populated = await Driver.findById(driver._id)
      .populate('userId', 'name email role')
      .populate('vehicleId', 'type capacity status');

    res.status(200).json({
      success: true,
      message: 'Driver updated.',
      data: { driver: populated },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createDriver, getDrivers, getDriverById, getMyDriverProfile, updateDriver };
