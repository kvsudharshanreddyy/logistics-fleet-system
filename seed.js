/**
 * Seed script — creates demo users, vehicles, drivers, and shipments.
 * Run: node seed.js
 *
 * Demo credentials (documented in README):
 *   Admin:      admin@logistics.com      / Admin@123
 *   Dispatcher: dispatch@logistics.com   / Dispatch@123
 *   Driver 1:   driver1@logistics.com    / Driver@123
 *   Driver 2:   driver2@logistics.com    / Driver@123
 *   Customer 1: customer1@logistics.com  / Customer@123
 *   Customer 2: customer2@logistics.com  / Customer@123
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');
const User = require('./models/User');
const Vehicle = require('./models/Vehicle');
const Driver = require('./models/Driver');
const Shipment = require('./models/Shipment');
const StatusHistory = require('./models/StatusHistory');
const Trip = require('./models/Trip');

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

const hash = (pw) => bcrypt.hash(pw, ROUNDS);

const seed = async () => {
  await connectDB();

  console.log('🌱 Seeding database...');

  // Clear existing data
  await Promise.all([
    User.deleteMany(),
    Vehicle.deleteMany(),
    Driver.deleteMany(),
    Shipment.deleteMany(),
    StatusHistory.deleteMany(),
    Trip.deleteMany(),
  ]);
  console.log('✅ Cleared existing data.');

  // ── Users ──────────────────────────────────────────────────────────────────
  const [
    adminPw, dispatchPw, driver1Pw, driver2Pw, cust1Pw, cust2Pw,
  ] = await Promise.all([
    hash('Admin@123'),
    hash('Dispatch@123'),
    hash('Driver@123'),
    hash('Driver@123'),
    hash('Customer@123'),
    hash('Customer@123'),
  ]);

  const [admin, dispatcher, driverUser1, driverUser2, customer1, customer2] =
    await User.insertMany([
      { name: 'System Admin',    email: 'admin@logistics.com',      passwordHash: adminPw,     role: 'ADMIN' },
      { name: 'Dispatch Officer',email: 'dispatch@logistics.com',   passwordHash: dispatchPw,  role: 'DISPATCHER' },
      { name: 'Raj Kumar',       email: 'driver1@logistics.com',    passwordHash: driver1Pw,   role: 'DRIVER' },
      { name: 'Anita Singh',     email: 'driver2@logistics.com',    passwordHash: driver2Pw,   role: 'DRIVER' },
      { name: 'Priya Sharma',    email: 'customer1@logistics.com',  passwordHash: cust1Pw,     role: 'CUSTOMER' },
      { name: 'Arjun Patel',     email: 'customer2@logistics.com',  passwordHash: cust2Pw,     role: 'CUSTOMER' },
    ]);
  console.log('✅ Users created.');

  // ── Vehicles ───────────────────────────────────────────────────────────────
  const [truck1, van1, miniTruck1, van2] = await Vehicle.insertMany([
    { type: 'TRUCK',      capacity: 5000, status: 'AVAILABLE' },
    { type: 'VAN',        capacity: 800,  status: 'AVAILABLE' },
    { type: 'MINI_TRUCK', capacity: 1500, status: 'AVAILABLE' },
    { type: 'VAN',        capacity: 600,  status: 'INACTIVE' },
  ]);
  console.log('✅ Vehicles created.');

  // ── Drivers ────────────────────────────────────────────────────────────────
  const [driver1, driver2] = await Driver.insertMany([
    { userId: driverUser1._id, vehicleId: truck1._id,   isAvailable: false, licenseNumber: 'DL-101-2020', phone: '9876543210' },
    { userId: driverUser2._id, vehicleId: van1._id,     isAvailable: false, licenseNumber: 'DL-202-2021', phone: '9876543211' },
  ]);

  // Link vehicles to drivers
  await Vehicle.findByIdAndUpdate(truck1._id, { currentDriverId: driver1._id, status: 'ASSIGNED' });
  await Vehicle.findByIdAndUpdate(van1._id,   { currentDriverId: driver2._id, status: 'ASSIGNED' });
  console.log('✅ Drivers created.');

  // ── Shipments ──────────────────────────────────────────────────────────────
  const pricingUtil = require('./utils/pricing');

  // Shipment 1: BOOKED (unassigned)
  const s1Cost = pricingUtil.calculatePrice(120, 25, 'STANDARD');
  const shipment1 = await Shipment.create({
    customerId: customer1._id,
    pickupAddress: '12, MG Road, Bengaluru',
    dropAddress: '45, Anna Salai, Chennai',
    weight: 25,
    distance: 120,
    shipmentType: 'STANDARD',
    status: 'BOOKED',
    cost: s1Cost.totalCost,
  });
  await StatusHistory.create({ shipmentId: shipment1._id, status: 'BOOKED', note: 'Shipment booked.' });

  // Shipment 2: ASSIGNED to driver1
  const s2Cost = pricingUtil.calculatePrice(300, 100, 'EXPRESS');
  const shipment2 = await Shipment.create({
    customerId: customer1._id,
    pickupAddress: '7, Nehru Place, New Delhi',
    dropAddress: '22, Park Street, Kolkata',
    weight: 100,
    distance: 300,
    shipmentType: 'EXPRESS',
    status: 'ASSIGNED',
    assignedDriverId: driver1._id,
    assignedVehicleId: truck1._id,
    cost: s2Cost.totalCost,
  });
  await StatusHistory.insertMany([
    { shipmentId: shipment2._id, status: 'BOOKED',   note: 'Shipment booked.' },
    { shipmentId: shipment2._id, status: 'ASSIGNED',  note: 'Assigned to Raj Kumar.' },
  ]);

  // Shipment 3: IN_TRANSIT, assigned to driver2
  const s3Cost = pricingUtil.calculatePrice(50, 10, 'FRAGILE');
  const shipment3 = await Shipment.create({
    customerId: customer2._id,
    pickupAddress: '88, Linking Road, Mumbai',
    dropAddress: '14, Banjara Hills, Hyderabad',
    weight: 10,
    distance: 50,
    shipmentType: 'FRAGILE',
    status: 'IN_TRANSIT',
    assignedDriverId: driver2._id,
    assignedVehicleId: van1._id,
    cost: s3Cost.totalCost,
  });
  await StatusHistory.insertMany([
    { shipmentId: shipment3._id, status: 'BOOKED',     note: 'Shipment booked.' },
    { shipmentId: shipment3._id, status: 'ASSIGNED',   note: 'Assigned to Anita Singh.' },
    { shipmentId: shipment3._id, status: 'PICKED_UP',  note: 'Package picked up.', locationText: 'Mumbai Depot' },
    { shipmentId: shipment3._id, status: 'IN_TRANSIT', note: 'En route to Hyderabad.', locationText: 'Pune Toll' },
  ]);

  // Shipment 4: DELIVERED
  const s4Cost = pricingUtil.calculatePrice(80, 15, 'STANDARD');
  const shipment4 = await Shipment.create({
    customerId: customer2._id,
    pickupAddress: '5, Civil Lines, Jaipur',
    dropAddress: '33, Gomti Nagar, Lucknow',
    weight: 15,
    distance: 80,
    shipmentType: 'STANDARD',
    status: 'DELIVERED',
    assignedDriverId: driver1._id,
    assignedVehicleId: truck1._id,
    cost: s4Cost.totalCost,
    deliveryProof: {
      receiverName: 'Ramesh Gupta',
      confirmationNote: 'Received in good condition.',
      timestamp: new Date(),
    },
  });
  await StatusHistory.insertMany([
    { shipmentId: shipment4._id, status: 'BOOKED' },
    { shipmentId: shipment4._id, status: 'ASSIGNED' },
    { shipmentId: shipment4._id, status: 'PICKED_UP' },
    { shipmentId: shipment4._id, status: 'IN_TRANSIT' },
    { shipmentId: shipment4._id, status: 'DELIVERED', note: 'Delivered to Ramesh Gupta.' },
  ]);
  console.log('✅ Shipments created.');

  // ── Trip ───────────────────────────────────────────────────────────────────
  await Trip.create({
    driverId: driver1._id,
    shipmentIds: [shipment2._id],
    date: new Date(),
    notes: 'Delhi to Kolkata run',
  });
  console.log('✅ Trip created.');

  console.log('\n🎉 Seed complete! Demo credentials:');
  console.log('  Admin:      admin@logistics.com     / Admin@123');
  console.log('  Dispatcher: dispatch@logistics.com  / Dispatch@123');
  console.log('  Driver 1:   driver1@logistics.com   / Driver@123');
  console.log('  Driver 2:   driver2@logistics.com   / Driver@123');
  console.log('  Customer 1: customer1@logistics.com / Customer@123');
  console.log('  Customer 2: customer2@logistics.com / Customer@123\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
