const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Shipment = require('../models/Shipment');

/**
 * GET /api/admin/reports/fleet-utilization
 * Admin/Dispatcher only — fleet-wide utilization report
 */
const getFleetUtilization = async (req, res, next) => {
  try {
    // Vehicle stats
    const [
      totalVehicles,
      availableVehicles,
      assignedVehicles,
      inactiveVehicles,
    ] = await Promise.all([
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ status: 'AVAILABLE' }),
      Vehicle.countDocuments({ status: 'ASSIGNED' }),
      Vehicle.countDocuments({ status: 'INACTIVE' }),
    ]);

    // Driver stats
    const [
      totalDrivers,
      availableDrivers,
    ] = await Promise.all([
      Driver.countDocuments(),
      Driver.countDocuments({ isAvailable: true }),
    ]);
    const assignedDrivers = totalDrivers - availableDrivers;

    // Shipment stats
    const [
      totalShipments,
      bookedShipments,
      assignedShipments,
      pickedUpShipments,
      inTransitShipments,
      deliveredShipments,
      failedShipments,
    ] = await Promise.all([
      Shipment.countDocuments(),
      Shipment.countDocuments({ status: 'BOOKED' }),
      Shipment.countDocuments({ status: 'ASSIGNED' }),
      Shipment.countDocuments({ status: 'PICKED_UP' }),
      Shipment.countDocuments({ status: 'IN_TRANSIT' }),
      Shipment.countDocuments({ status: 'DELIVERED' }),
      Shipment.countDocuments({ status: 'FAILED' }),
    ]);

    const activeShipments = bookedShipments + assignedShipments + pickedUpShipments + inTransitShipments;

    // Delivery rate
    const completedShipments = deliveredShipments + failedShipments;
    const deliverySuccessRate =
      completedShipments > 0
        ? Math.round((deliveredShipments / completedShipments) * 10000) / 100
        : null;

    // Vehicle utilization rate
    const vehicleUtilizationRate =
      totalVehicles > 0
        ? Math.round((assignedVehicles / totalVehicles) * 10000) / 100
        : 0;

    // Driver utilization rate
    const driverUtilizationRate =
      totalDrivers > 0
        ? Math.round((assignedDrivers / totalDrivers) * 10000) / 100
        : 0;

    // Top vehicles by type breakdown
    const vehiclesByType = await Vehicle.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 }, totalCapacity: { $sum: '$capacity' } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      message: 'Fleet utilization report generated.',
      data: {
        generatedAt: new Date(),
        vehicles: {
          total: totalVehicles,
          available: availableVehicles,
          assigned: assignedVehicles,
          inactive: inactiveVehicles,
          utilizationRate: `${vehicleUtilizationRate}%`,
          byType: vehiclesByType,
        },
        drivers: {
          total: totalDrivers,
          available: availableDrivers,
          assigned: assignedDrivers,
          utilizationRate: `${driverUtilizationRate}%`,
        },
        shipments: {
          total: totalShipments,
          booked: bookedShipments,
          assigned: assignedShipments,
          pickedUp: pickedUpShipments,
          inTransit: inTransitShipments,
          delivered: deliveredShipments,
          failed: failedShipments,
          active: activeShipments,
          deliverySuccessRate:
            deliverySuccessRate !== null ? `${deliverySuccessRate}%` : 'N/A (no completed shipments)',
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getFleetUtilization };
