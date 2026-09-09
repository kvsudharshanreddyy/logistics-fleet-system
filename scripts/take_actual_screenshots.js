const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const PICS_DIR = path.join(__dirname, '..', 'pics');
const BASE_URL = 'http://localhost:5000';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  if (!fs.existsSync(PICS_DIR)) {
    fs.mkdirSync(PICS_DIR, { recursive: true });
  }

  console.log('🚀 Starting Chrome to capture real application screenshots from port 5000...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--ignore-certificate-errors', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2, // High DPI for crisp screenshots
    },
  });

  const page = await browser.newPage();

  async function take(filename, desc) {
    await sleep(800);
    const savePath = path.join(PICS_DIR, filename);
    await page.screenshot({ path: savePath, fullPage: false });
    console.log(`📸 [Saved] ${filename} - ${desc}`);
  }

  async function login(email, password) {
    await page.evaluate(async (em, pw) => {
      if (typeof doLogout === 'function') doLogout();
      const res = await api('POST', '/auth/login', { email: em, password: pw }, null);
      if (!res.success) throw new Error(res.message || 'Login failed');
      authToken = res.data.token;
      currentUser = res.data.user;
      enterApp();
    }, email, password);
    await sleep(1500);
  }

  try {
    // 1. Login Page
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await sleep(1000);
    await take('01_login_page.png', 'Port 5000 Login Screen');

    // 2. Register Page
    await page.evaluate(() => showAuthTab('register'));
    await sleep(500);
    await take('02_register_page.png', 'Port 5000 Register Screen');

    // 3. Admin: Dashboard
    console.log('Logging in as Admin (admin@logistics.com)...');
    await login('admin@logistics.com', 'Admin@123');
    await page.evaluate(async () => {
      showPage('admin-dashboard', loadAdminDashboard);
    });
    await sleep(2000);
    await take('03_admin_dashboard.png', 'Admin Dashboard with live KPIs and Recent Shipments');

    // 4. Admin: Vehicle Fleet
    console.log('Navigating to Vehicle Fleet...');
    await page.evaluate(async () => {
      showPage('vehicles', loadVehicles);
    });
    await sleep(2000);
    await take('04_vehicle_fleet.png', 'Vehicle Fleet Cards with capacities, driver assignments and status');

    // 5. Admin: Add Vehicle Modal
    await page.evaluate(() => {
      openVehicleModal();
      const m = document.getElementById('vehicleModal');
      if (m) {
        m.classList.add('show');
        m.style.display = 'block';
        m.removeAttribute('aria-hidden');
      }
    });
    await sleep(600);
    await take('05_add_vehicle_modal.png', 'Add Vehicle Modal Dialog');
    await page.evaluate(() => {
      const m = document.getElementById('vehicleModal');
      if (m) {
        m.classList.remove('show');
        m.style.display = 'none';
      }
      document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
      document.body.classList.remove('modal-open');
    });
    await sleep(400);

    // 6. Admin: Drivers List
    console.log('Navigating to Drivers List...');
    await page.evaluate(async () => {
      showPage('drivers', loadDriversList);
    });
    await sleep(2000);
    await take('06_drivers_list.png', 'Drivers Table with license, contact, and availability');

    // 7. Admin: Add Driver Modal
    await page.evaluate(() => {
      openDriverModal();
      const m = document.getElementById('driverModal');
      if (m) {
        m.classList.add('show');
        m.style.display = 'block';
        m.removeAttribute('aria-hidden');
      }
    });
    await sleep(600);
    await take('07_add_driver_modal.png', 'Add Driver Profile Modal');
    await page.evaluate(() => {
      const m = document.getElementById('driverModal');
      if (m) {
        m.classList.remove('show');
        m.style.display = 'none';
      }
      document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
      document.body.classList.remove('modal-open');
    });
    await sleep(400);

    // 8. Admin: All Shipments
    console.log('Navigating to All Shipments...');
    await page.evaluate(async () => {
      showPage('all-shipments', loadAdminShipments);
    });
    await sleep(2000);
    await take('08_all_shipments.png', 'All Shipments Table with status filters and details');

    // 9. Admin: Assign Shipment
    console.log('Navigating to Assign Shipment...');
    await page.evaluate(async () => {
      showPage('assign-shipment', loadAssignForm);
    });
    await sleep(2000);
    await take('09_assign_shipment.png', 'Assign Shipment to Driver and Vehicle Dispatcher Console');

    // 10. Admin: Trips Management
    console.log('Navigating to Trips...');
    await page.evaluate(async () => {
      showPage('trips', loadTrips);
    });
    await sleep(2000);
    await take('10_trips_management.png', 'Trips Management Page');

    // 11. Admin: Create Trip Modal
    await page.evaluate(() => {
      openTripModal();
      const m = document.getElementById('tripModal');
      if (m) {
        m.classList.add('show');
        m.style.display = 'block';
        m.removeAttribute('aria-hidden');
      }
    });
    await sleep(600);
    await take('11_create_trip_modal.png', 'Create Trip Modal with multi-shipment selection');
    await page.evaluate(() => {
      const m = document.getElementById('tripModal');
      if (m) {
        m.classList.remove('show');
        m.style.display = 'none';
      }
      document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
      document.body.classList.remove('modal-open');
    });
    await sleep(400);

    // 12. Admin: Fleet Utilization Report
    console.log('Navigating to Fleet Utilization Report...');
    await page.evaluate(async () => {
      showPage('fleet-report', loadFleetReport);
    });
    await sleep(2500);
    await take('12_fleet_utilization_report.png', 'Fleet Utilization Analytics and Metrics Report');

    // 13. Customer: My Shipments
    console.log('Logging in as Customer (customer1@logistics.com)...');
    await login('customer1@logistics.com', 'Customer@123');
    await page.evaluate(async () => {
      showPage('my-shipments', loadMyShipments);
    });
    await sleep(2000);
    await take('13_customer_my_shipments.png', 'Customer Portal My Shipments');

    // 14. Customer: Book Shipment
    console.log('Navigating to Book Shipment...');
    await page.evaluate(() => {
      showPage('book-shipment');
      document.getElementById('book-pickup').value = 'Bandra Kurla Complex, Mumbai';
      document.getElementById('book-drop').value = 'Electronic City, Bengaluru';
      document.getElementById('book-weight').value = '25';
      document.getElementById('book-distance').value = '980';
      document.getElementById('book-type').value = 'EXPRESS';
      estimatePrice();
    });
    await sleep(1500);
    await take('14_customer_book_shipment.png', 'Customer Book Shipment with real-time Price Estimation');

    // 15. Customer: Track Shipment
    console.log('Navigating to Track Shipment...');
    await page.evaluate(async () => {
      showPage('track-shipment');
      const res = await api('GET', '/shipments');
      if (res.success && res.data.shipments && res.data.shipments.length > 0) {
        const id = res.data.shipments[0]._id;
        document.getElementById('track-id').value = id;
        await doTrackShipment();
      }
    });
    await sleep(2000);
    await take('15_customer_track_shipment.png', 'Live Shipment Tracking with Event Audit Timeline');

    // 16. Driver: Profile
    console.log('Logging in as Driver (driver1@logistics.com)...');
    await login('driver1@logistics.com', 'Driver@123');
    await page.evaluate(async () => {
      showPage('driver-profile', loadDriverProfile);
    });
    await sleep(2000);
    await take('16_driver_profile.png', 'Driver Profile Details and Vehicle Assignment');

    // 17. Driver: Assigned Shipments
    console.log('Navigating to Driver Assigned Shipments...');
    await page.evaluate(async () => {
      showPage('assigned-shipments', loadAssignedShipments);
    });
    await sleep(2000);
    await take('17_driver_assigned_shipments.png', 'Driver Assigned Shipments Table');

    // 18. Driver: Update Status & Delivery Proof
    console.log('Navigating to Driver Update Status...');
    await page.evaluate(async () => {
      showPage('update-status', loadDriverStatusPage);
    });
    await sleep(2000);
    await take('18_driver_update_status.png', 'Driver Status Updater and Proof of Delivery Form');

    console.log('🎉 All 18 actual screenshots from port 5000 captured successfully!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

run();
