/**
 * Integration test script using mongodb-memory-server.
 * Tests all major API endpoints end-to-end.
 * Run: node test_api.js
 */

require('dotenv').config();
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const http = require('http');

// Temporarily override MONGODB_URI with in-memory DB
let mongoServer;
let server;

const BASE_URL = 'http://localhost:5001';
let customerToken, driverToken, adminToken;
let shipmentId, vehicleId, driverId, driverUserId;

// ─── HTTP Helper ────────────────────────────────────────────────────────────
function request(method, path, body, token) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: '/api' + path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Test Utilities ──────────────────────────────────────────────────────────
let passed = 0, failed = 0;
const results = [];

function check(testName, condition, expected, actual) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
    results.push({ test: testName, result: 'PASS' });
  } else {
    console.log(`  ❌ ${testName} | Expected: ${expected} | Got: ${actual}`);
    failed++;
    results.push({ test: testName, result: 'FAIL', expected, actual });
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────
async function runTests() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  LOGISTICS FLEET SYSTEM — API TEST SUITE');
  console.log('══════════════════════════════════════════════════\n');

  // ── Health Check ──────────────────────────────────────────────────────────
  console.log('▶ Health Check');
  const health = await request('GET', '/health');
  check('Server running (200)', health.status === 200, 200, health.status);

  // ── AUTH ──────────────────────────────────────────────────────────────────
  console.log('\n▶ Authentication');

  const reg1 = await request('POST', '/auth/register', {
    name: 'Test Customer', email: 'cust@test.com', password: 'Test@123', role: 'CUSTOMER',
  });
  check('Register Customer (201)', reg1.status === 201, 201, reg1.status);
  customerToken = reg1.body?.data?.token;
  check('Customer token received', !!customerToken, 'token', 'none');

  const regDrv = await request('POST', '/auth/register', {
    name: 'Test Driver', email: 'drv@test.com', password: 'Test@123', role: 'DRIVER',
  });
  check('Register Driver (201)', regDrv.status === 201, 201, regDrv.status);
  driverToken = regDrv.body?.data?.token;
  driverUserId = regDrv.body?.data?.user?.id;

  const regAdmin = await request('POST', '/auth/register', {
    name: 'Admin User', email: 'admin@test.com', password: 'Admin@123', role: 'CUSTOMER',
  });
  // Admin can only be created via seed; let's test login with wrong password
  const loginBad = await request('POST', '/auth/login', { email: 'cust@test.com', password: 'wrongpass' });
  check('Login with wrong password (401)', loginBad.status === 401, 401, loginBad.status);

  const loginOk = await request('POST', '/auth/login', { email: 'cust@test.com', password: 'Test@123' });
  check('Login Customer (200)', loginOk.status === 200, 200, loginOk.status);
  customerToken = loginOk.body?.data?.token; // refresh

  // Validation — missing field
  const regMissing = await request('POST', '/auth/register', { name: 'X', email: 'x@x.com' });
  check('Register missing fields (400)', regMissing.status === 400, 400, regMissing.status);

  // Duplicate email
  const regDup = await request('POST', '/auth/register', {
    name: 'Dup', email: 'cust@test.com', password: 'Test@123', role: 'CUSTOMER',
  });
  check('Duplicate email (409)', regDup.status === 409, 409, regDup.status);

  // Password not in response
  check('Password not in register response', !JSON.stringify(reg1.body).includes('"password"'), true, false);

  // ── NO TOKEN → 401 ────────────────────────────────────────────────────────
  console.log('\n▶ Authentication Middleware');
  const noToken = await request('GET', '/vehicles');
  check('No token → 401', noToken.status === 401, 401, noToken.status);

  // ── VEHICLES ──────────────────────────────────────────────────────────────
  console.log('\n▶ Vehicles (RBAC)');

  // Customer cannot create vehicle → 403
  const custVehicle = await request('POST', '/vehicles', { type: 'VAN', capacity: 500 }, customerToken);
  check('Customer → create vehicle (403)', custVehicle.status === 403, 403, custVehicle.status);

  // Need an admin token — create admin user directly via model
  const bcrypt = require('bcryptjs');
  const User = require('./models/User');
  const { generateToken } = require('./utils/token');
  const adminUser = await User.create({
    name: 'Admin', email: 'admin2@test.com',
    passwordHash: await bcrypt.hash('Admin@123', 10),
    role: 'ADMIN',
  });
  adminToken = generateToken({ id: adminUser._id, role: 'ADMIN' });

  const createVeh = await request('POST', '/vehicles', { type: 'VAN', capacity: 800 }, adminToken);
  check('Admin → create vehicle (201)', createVeh.status === 201, 201, createVeh.status);
  vehicleId = createVeh.body?.data?.vehicle?._id;

  const getVehs = await request('GET', '/vehicles', null, adminToken);
  check('Get vehicles (200)', getVehs.status === 200, 200, getVehs.status);

  const getVeh = await request('GET', `/vehicles/${vehicleId}`, null, adminToken);
  check('Get vehicle by ID (200)', getVeh.status === 200, 200, getVeh.status);

  const updateVeh = await request('PUT', `/vehicles/${vehicleId}`, { capacity: 1200 }, adminToken);
  check('Update vehicle (200)', updateVeh.status === 200, 200, updateVeh.status);
  check('Capacity updated', updateVeh.body?.data?.vehicle?.capacity === 1200, 1200, updateVeh.body?.data?.vehicle?.capacity);

  // Validation — missing required field
  const badVeh = await request('POST', '/vehicles', { capacity: 500 }, adminToken);
  check('Missing type → 400', badVeh.status === 400, 400, badVeh.status);

  // ── DRIVERS ──────────────────────────────────────────────────────────────
  console.log('\n▶ Drivers');

  const createDrv = await request('POST', '/drivers', {
    userId: driverUserId, licenseNumber: 'DL-001', phone: '9876543210',
  }, adminToken);
  check('Create driver profile (201)', createDrv.status === 201, 201, createDrv.status);
  driverId = createDrv.body?.data?.driver?._id;

  // Driver cannot create another driver profile
  const drvCreateDrv = await request('POST', '/drivers', { userId: driverUserId }, driverToken);
  check('Driver → create driver profile (403)', drvCreateDrv.status === 403, 403, drvCreateDrv.status);

  // Driver gets own profile
  const drvMe = await request('GET', '/drivers/me', null, driverToken);
  check('Driver → GET /drivers/me (200)', drvMe.status === 200, 200, drvMe.status);

  // ── SHIPMENTS ──────────────────────────────────────────────────────────────
  console.log('\n▶ Shipments');

  // Customer creates shipment
  const createShip = await request('POST', '/shipments', {
    pickupAddress: '12, MG Road, Bengaluru',
    dropAddress: '45, Anna Salai, Chennai',
    weight: 20,
    distance: 350,
    shipmentType: 'STANDARD',
  }, customerToken);
  check('Customer → create shipment (201)', createShip.status === 201, 201, createShip.status);
  shipmentId = createShip.body?.data?.shipment?._id;
  check('Shipment cost calculated', createShip.body?.data?.shipment?.cost > 0, '>0', createShip.body?.data?.shipment?.cost);
  check('Initial status = BOOKED', createShip.body?.data?.shipment?.status === 'BOOKED', 'BOOKED', createShip.body?.data?.shipment?.status);

  // Driver cannot create shipment
  const drvShip = await request('POST', '/shipments', {
    pickupAddress: 'A', dropAddress: 'B', weight: 5, distance: 10,
  }, driverToken);
  check('Driver → create shipment (403)', drvShip.status === 403, 403, drvShip.status);

  // Validation — missing required fields
  const badShip = await request('POST', '/shipments', { pickupAddress: 'Only' }, customerToken);
  check('Missing shipment fields → 400', badShip.status === 400, 400, badShip.status);

  // Customer can only see own shipments
  const myShips = await request('GET', '/shipments', null, customerToken);
  check('Customer GET /shipments (200)', myShips.status === 200, 200, myShips.status);

  // ── DISPATCH ASSIGNMENT ──────────────────────────────────────────────────
  console.log('\n▶ Dispatch Assignment');

  // Try to assign with unavailable vehicle first (mark vehicle as assigned manually for test)
  const assignOk = await request('PUT', `/shipments/${shipmentId}/assign`, {
    driverId, vehicleId,
  }, adminToken);
  check('Admin assigns shipment (200)', assignOk.status === 200, 200, assignOk.status);
  check('Status changes to ASSIGNED', assignOk.body?.data?.shipment?.status === 'ASSIGNED', 'ASSIGNED', assignOk.body?.data?.shipment?.status);

  // Try to assign same shipment again (not BOOKED anymore)
  const reassign = await request('PUT', `/shipments/${shipmentId}/assign`, {
    driverId, vehicleId,
  }, adminToken);
  check('Re-assign ASSIGNED shipment (409)', reassign.status === 409, 409, reassign.status);

  // ── STATUS WORKFLOW ──────────────────────────────────────────────────────
  console.log('\n▶ Status Workflow');

  // Driver updates status: ASSIGNED → PICKED_UP
  const pickedUp = await request('PUT', `/shipments/${shipmentId}/status`, {
    status: 'PICKED_UP', note: 'Collected', locationText: 'Depot',
  }, driverToken);
  check('Driver PICKED_UP (200)', pickedUp.status === 200, 200, pickedUp.status);

  // PICKED_UP → IN_TRANSIT
  const inTransit = await request('PUT', `/shipments/${shipmentId}/status`, {
    status: 'IN_TRANSIT', note: 'En route',
  }, driverToken);
  check('Driver IN_TRANSIT (200)', inTransit.status === 200, 200, inTransit.status);

  // Invalid transition: IN_TRANSIT → BOOKED (400 — Joi validation rejects BOOKED)
  const invalidTrans = await request('PUT', `/shipments/${shipmentId}/status`, {
    status: 'BOOKED',
  }, driverToken);
  check('Invalid status BOOKED → rejected (400)', invalidTrans.status === 400, 400, invalidTrans.status);

  // Invalid transition: IN_TRANSIT → PICKED_UP (409 — Joi allows PICKED_UP, but business rule rejects backward move)
  const invalidBizBack = await request('PUT', `/shipments/${shipmentId}/status`, {
    status: 'PICKED_UP',
  }, driverToken);
  check('IN_TRANSIT → PICKED_UP backward (409)', invalidBizBack.status === 409, 409, invalidBizBack.status);

  // DELIVERED — valid final transition
  const delivered = await request('PUT', `/shipments/${shipmentId}/status`, {
    status: 'DELIVERED', note: 'Done',
  }, driverToken);
  check('Driver DELIVERED (200)', delivered.status === 200, 200, delivered.status);

  // Test actual business rule violation: DELIVERED → IN_TRANSIT (409 — passes Joi, fails business logic)
  const invalidBiz = await request('PUT', `/shipments/${shipmentId}/status`, {
    status: 'IN_TRANSIT',
  }, driverToken);
  check('DELIVERED → IN_TRANSIT (409 business rule)', invalidBiz.status === 409, 409, invalidBiz.status);

  // ── DELIVERY PROOF ──────────────────────────────────────────────────────
  console.log('\n▶ Delivery Proof');

  const proof = await request('POST', `/shipments/${shipmentId}/delivery-proof`, {
    receiverName: 'Ram Kumar', confirmationNote: 'Signed and received',
  }, driverToken);
  check('Add delivery proof (200)', proof.status === 200, 200, proof.status);
  check('Receiver name saved', proof.body?.data?.shipment?.deliveryProof?.receiverName === 'Ram Kumar', 'Ram Kumar', proof.body?.data?.shipment?.deliveryProof?.receiverName);

  // ── TRACKING ────────────────────────────────────────────────────────────
  console.log('\n▶ Customer Tracking');

  const track = await request('GET', `/shipments/${shipmentId}/track`, null, customerToken);
  check('Track own shipment (200)', track.status === 200, 200, track.status);
  check('Status history present', Array.isArray(track.body?.data?.statusHistory), true, false);
  check('Delivery proof in tracking', !!track.body?.data?.shipment?.deliveryProof?.receiverName, true, false);

  // Ownership check — create second customer
  const cust2Reg = await request('POST', '/auth/register', {
    name: 'Cust 2', email: 'cust2@test.com', password: 'Test@123', role: 'CUSTOMER',
  });
  const cust2Token = cust2Reg.body?.data?.token;
  const ownership = await request('GET', `/shipments/${shipmentId}/track`, null, cust2Token);
  check('Customer 2 cannot track Customer 1 shipment (403)', ownership.status === 403, 403, ownership.status);

  // ── PRICING ────────────────────────────────────────────────────────────
  console.log('\n▶ Pricing Engine');

  const price1 = await request('POST', '/pricing/estimate', {
    distance: 100, weight: 10, shipmentType: 'STANDARD',
  }, customerToken);
  check('Pricing estimate (200)', price1.status === 200, 200, price1.status);
  check('Total cost > 0', price1.body?.data?.pricing?.totalCost > 0, '>0', price1.body?.data?.pricing?.totalCost);

  const price2 = await request('POST', '/pricing/estimate', {
    distance: 100, weight: 10, shipmentType: 'EXPRESS',
  }, customerToken);
  check('EXPRESS > STANDARD cost', price2.body?.data?.pricing?.totalCost > price1.body?.data?.pricing?.totalCost, true, false);

  // ── FLEET REPORT ─────────────────────────────────────────────────────────
  console.log('\n▶ Fleet Report');

  const report = await request('GET', '/admin/reports/fleet-utilization', null, adminToken);
  check('Fleet report (200)', report.status === 200, 200, report.status);
  check('Total shipments in report', report.body?.data?.shipments?.total >= 1, true, false);

  // Customer cannot access report → 403
  const custReport = await request('GET', '/admin/reports/fleet-utilization', null, customerToken);
  check('Customer → fleet report (403)', custReport.status === 403, 403, custReport.status);

  // ── 404 ──────────────────────────────────────────────────────────────────
  console.log('\n▶ 404 Handling');

  const notFound = await request('GET', '/shipments/000000000000000000000001', null, adminToken);
  check('Non-existent shipment → 404', notFound.status === 404, 404, notFound.status);

  const badId = await request('GET', '/shipments/notanid', null, adminToken);
  check('Invalid ObjectId → 400', badId.status === 400, 400, badId.status);

  // ── DEACTIVATE VEHICLE ───────────────────────────────────────────────────
  console.log('\n▶ Vehicle Deactivation');

  const createVeh2 = await request('POST', '/vehicles', { type: 'BIKE', capacity: 50 }, adminToken);
  const veh2Id = createVeh2.body?.data?.vehicle?._id;
  const deact = await request('DELETE', `/vehicles/${veh2Id}`, null, adminToken);
  check('Deactivate available vehicle (200)', deact.status === 200, 200, deact.status);
  check('Vehicle status = INACTIVE', deact.body?.data?.vehicle?.status === 'INACTIVE', 'INACTIVE', deact.body?.data?.vehicle?.status);

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => r.result === 'FAIL').forEach(r => {
      console.log(`  - ${r.test}: expected ${r.expected}, got ${r.actual}`);
    });
  }

  return failed;
}

// ─── Main ────────────────────────────────────────────────────────────────────
(async () => {
  try {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;
    process.env.PORT = '5001';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
    process.env.BCRYPT_ROUNDS = '4'; // Fast for tests

    await mongoose.connect(uri);
    console.log('✅ In-memory MongoDB started');

    // Start Express app
    const app = require('./server');
    await new Promise(r => setTimeout(r, 1000)); // Wait for server to bind

    const failCount = await runTests();

    await mongoose.disconnect();
    await mongoServer.stop();
    process.exit(failCount > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test runner failed:', err.message);
    console.error(err.stack);
    if (mongoServer) await mongoServer.stop();
    process.exit(1);
  }
})();
