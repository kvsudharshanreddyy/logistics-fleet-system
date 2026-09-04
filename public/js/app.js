/**
 * LogiFleet — Frontend Application
 * Communicates with the Express backend via fetch() API.
 */

const BASE = '/api';
let authToken = null;
let currentUser = null;

// ═══════════════════════════════════════════════════════════ API HELPER
async function api(method, path, body = null, token = authToken) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  return res.json();
}

// ═══════════════════════════════════════════════════════════ UI HELPERS
function showAlert(elId, msg, type = 'error') {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert-box show ${type}`;
}
function clearAlert(elId) {
  const el = document.getElementById(elId);
  if (el) el.className = 'alert-box';
}

function statusBadge(status) {
  return `<span class="badge-status status-${status}">${status}</span>`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

// ═══════════════════════════════════════════════════════════ AUTH
function showAuthTab(tab) {
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  clearAlert('auth-alert');
  document.querySelectorAll('#auth-tabs .nav-link').forEach((el, i) => {
    el.classList.toggle('active', (i === 0) === (tab === 'login'));
  });
}

async function doLogin(e) {
  e.preventDefault();
  clearAlert('auth-alert');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const data = await api('POST', '/auth/login', { email, password }, null);
  if (!data.success) return showAlert('auth-alert', data.message || 'Login failed');
  authToken = data.data.token;
  currentUser = data.data.user;
  enterApp();
}

async function doRegister(e) {
  e.preventDefault();
  clearAlert('auth-alert');
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;
  const data = await api('POST', '/auth/register', { name, email, password, role }, null);
  if (!data.success) return showAlert('auth-alert', data.message || 'Registration failed');
  authToken = data.data.token;
  currentUser = data.data.user;
  enterApp();
}

function doLogout() {
  authToken = null;
  currentUser = null;
  document.getElementById('auth-section').style.display = '';
  document.getElementById('app-section').style.display = 'none';
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  clearAlert('auth-alert');
  showAuthTab('login');
}

// ═══════════════════════════════════════════════════════════ APP INIT
function enterApp() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('app-section').style.display = 'flex';
  document.getElementById('nav-user-name').textContent = currentUser.name;
  document.getElementById('nav-role-badge').textContent = currentUser.role;
  buildSidebar();
  loadDefaultPage();
}

const SIDEBARS = {
  CUSTOMER: [
    { label: 'My Shipments',    page: 'my-shipments',   icon: 'box-seam', fn: loadMyShipments },
    { label: 'Book Shipment',   page: 'book-shipment',  icon: 'plus-circle' },
    { label: 'Track Shipment',  page: 'track-shipment', icon: 'geo-alt' },
  ],
  DRIVER: [
    { label: 'My Profile',       page: 'driver-profile',      icon: 'person-badge', fn: loadDriverProfile },
    { label: 'Assigned Shipments', page: 'assigned-shipments', icon: 'clipboard-check', fn: loadAssignedShipments },
    { label: 'Update Status',    page: 'update-status',       icon: 'arrow-repeat', fn: loadDriverStatusPage },
  ],
  ADMIN: adminSidebarItems(),
  DISPATCHER: adminSidebarItems(),
};

function adminSidebarItems() {
  return [
    { label: 'Dashboard',       page: 'admin-dashboard', icon: 'speedometer2', fn: loadAdminDashboard },
    { label: 'Vehicles',        page: 'vehicles',        icon: 'truck',        fn: loadVehicles },
    { label: 'Drivers',         page: 'drivers',         icon: 'people',       fn: loadDriversList },
    { label: 'All Shipments',   page: 'all-shipments',   icon: 'box-seam',     fn: loadAdminShipments },
    { label: 'Assign Shipment', page: 'assign-shipment', icon: 'person-check', fn: loadAssignForm },
    { label: 'Trips',           page: 'trips',           icon: 'map',          fn: loadTrips },
    { label: 'Fleet Report',    page: 'fleet-report',    icon: 'bar-chart',    fn: loadFleetReport },
  ];
}

function buildSidebar() {
  const items = SIDEBARS[currentUser.role] || [];
  const sidebar = document.getElementById('main-sidebar');
  sidebar.innerHTML = `<div class="sidebar-label">Navigation</div>` +
    items.map(it =>
      `<a href="#" id="nav-${it.page}" onclick="showPage('${it.page}', ${it.fn ? it.fn.name : 'null'}); return false;">
        <i class="bi bi-${it.icon} me-2"></i>${it.label}
      </a>`
    ).join('');
}

function showPage(pageId, fn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  const nav = document.getElementById('nav-' + pageId);
  if (page) page.classList.add('active');
  if (nav) nav.classList.add('active');
  if (fn) fn();
}

function loadDefaultPage() {
  const role = currentUser.role;
  if (role === 'CUSTOMER') showPage('my-shipments', loadMyShipments);
  else if (role === 'DRIVER') showPage('driver-profile', loadDriverProfile);
  else showPage('admin-dashboard', loadAdminDashboard);
}

// ═══════════════════════════════════════════════════════════ CUSTOMER

async function loadMyShipments() {
  clearAlert('my-shipments-alert');
  const data = await api('GET', '/shipments');
  if (!data.success) return showAlert('my-shipments-alert', data.message);
  const shipments = data.data.shipments;
  const el = document.getElementById('my-shipments-list');
  if (!shipments.length) { el.innerHTML = '<p class="text-muted">No shipments yet. Book your first shipment!</p>'; return; }
  el.innerHTML = `<div class="table-responsive"><table class="table table-hover">
    <thead><tr><th>ID</th><th>Pickup</th><th>Drop</th><th>Type</th><th>Status</th><th>Cost</th><th>Date</th><th></th></tr></thead>
    <tbody>
    ${shipments.map(s => `
      <tr>
        <td><code style="font-size:0.7rem">${s._id.slice(-8)}</code></td>
        <td>${truncate(s.pickupAddress, 30)}</td>
        <td>${truncate(s.dropAddress, 30)}</td>
        <td>${s.shipmentType}</td>
        <td>${statusBadge(s.status)}</td>
        <td>₹${s.cost}</td>
        <td>${fmtDate(s.createdAt)}</td>
        <td><button class="btn btn-sm btn-outline-primary" onclick="trackById('${s._id}')">Track</button></td>
      </tr>`).join('')}
    </tbody></table></div>`;
}

function truncate(str, n) { return str.length > n ? str.slice(0, n) + '…' : str; }

async function estimatePrice() {
  const w = parseFloat(document.getElementById('book-weight').value);
  const d = parseFloat(document.getElementById('book-distance').value);
  const t = document.getElementById('book-type').value;
  const data = await api('POST', '/pricing/estimate', { distance: d, weight: w, shipmentType: t });
  const el = document.getElementById('book-price-preview');
  if (!data.success) { el.style.display = 'none'; return; }
  const p = data.data.pricing;
  el.style.display = 'block';
  el.innerHTML = `<strong>Estimated Cost: ₹${p.totalCost}</strong> | Base: ₹${p.baseRate} | Distance: ₹${p.distanceCost} | Weight: ₹${p.weightCost} | Surcharge: ₹${p.surchargeAmount}`;
}

async function doBookShipment(e) {
  e.preventDefault();
  clearAlert('book-alert');
  const body = {
    pickupAddress: document.getElementById('book-pickup').value.trim(),
    dropAddress: document.getElementById('book-drop').value.trim(),
    weight: parseFloat(document.getElementById('book-weight').value),
    distance: parseFloat(document.getElementById('book-distance').value),
    shipmentType: document.getElementById('book-type').value,
  };
  const data = await api('POST', '/shipments', body);
  if (!data.success) return showAlert('book-alert', data.message);
  showAlert('book-alert', `Shipment booked! ID: ${data.data.shipment._id} | Cost: ₹${data.data.shipment.cost}`, 'success');
  document.getElementById('book-pickup').value = '';
  document.getElementById('book-drop').value = '';
}

function trackById(id) {
  document.getElementById('track-id').value = id;
  showPage('track-shipment', null);
  doTrackShipment();
}

async function doTrackShipment() {
  clearAlert('track-alert');
  const id = document.getElementById('track-id').value.trim();
  if (!id) return showAlert('track-alert', 'Please enter a shipment ID.');
  const data = await api('GET', `/shipments/${id}/track`);
  const el = document.getElementById('track-result');
  if (!data.success) { el.innerHTML = ''; return showAlert('track-alert', data.message); }
  const { shipment, statusHistory } = data.data;
  const driver = shipment.assignedDriver ? (shipment.assignedDriver.userId?.name || '—') : '—';
  const vehicle = shipment.assignedVehicle ? `${shipment.assignedVehicle.type}` : '—';
  el.innerHTML = `
    <div class="card p-3 mb-3">
      <div class="d-flex justify-content-between mb-2">
        <strong>${statusBadge(shipment.status)}</strong>
        <small class="text-muted">${fmtDate(shipment.updatedAt)}</small>
      </div>
      <div class="row g-2 small">
        <div class="col-6"><strong>From:</strong><br>${shipment.pickupAddress}</div>
        <div class="col-6"><strong>To:</strong><br>${shipment.dropAddress}</div>
        <div class="col-4"><strong>Type:</strong> ${shipment.shipmentType}</div>
        <div class="col-4"><strong>Weight:</strong> ${shipment.weight}kg</div>
        <div class="col-4"><strong>Cost:</strong> ₹${shipment.cost}</div>
        <div class="col-6"><strong>Driver:</strong> ${driver}</div>
        <div class="col-6"><strong>Vehicle:</strong> ${vehicle}</div>
      </div>
      ${shipment.deliveryProof?.receiverName ? `
      <div class="mt-2 p-2 bg-success bg-opacity-10 rounded small">
        <strong>Delivery Proof:</strong> Received by ${shipment.deliveryProof.receiverName}
        ${shipment.deliveryProof.confirmationNote ? '— ' + shipment.deliveryProof.confirmationNote : ''}
      </div>` : ''}
    </div>
    <h6 class="fw-bold">Status History</h6>
    ${statusHistory.map(h => `
      <div class="history-item">
        <div class="history-dot"></div>
        <div>
          ${statusBadge(h.status)}
          <span class="text-muted ms-2 small">${fmtDate(h.timestamp)}</span>
          ${h.note ? `<div class="text-muted small">${h.note}</div>` : ''}
          ${h.locationText ? `<div class="text-muted small"><i class="bi bi-geo-alt"></i> ${h.locationText}</div>` : ''}
        </div>
      </div>`).join('')}
  `;
}

// ═══════════════════════════════════════════════════════════ DRIVER

async function loadDriverProfile() {
  const data = await api('GET', '/drivers/me');
  const el = document.getElementById('driver-profile-content');
  if (!data.success) { el.innerHTML = `<div class="alert-box show error">${data.message}</div>`; return; }
  const d = data.data.driver;
  el.innerHTML = `
    <div class="row g-3">
      <div class="col-6"><strong>Name</strong><br>${d.userId?.name || '—'}</div>
      <div class="col-6"><strong>Email</strong><br>${d.userId?.email || '—'}</div>
      <div class="col-6"><strong>License</strong><br>${d.licenseNumber || '—'}</div>
      <div class="col-6"><strong>Phone</strong><br>${d.phone || '—'}</div>
      <div class="col-6"><strong>Vehicle</strong><br>${d.vehicleId ? d.vehicleId.type + ' (' + d.vehicleId.capacity + 'kg)' : 'None assigned'}</div>
      <div class="col-6"><strong>Available</strong><br>${d.isAvailable ? '<span class="text-success">Yes</span>' : '<span class="text-danger">No (on assignment)</span>'}</div>
    </div>`;
}

async function loadAssignedShipments() {
  clearAlert('assigned-alert');
  const data = await api('GET', '/shipments');
  if (!data.success) return showAlert('assigned-alert', data.message);
  const shipments = data.data.shipments;
  const el = document.getElementById('assigned-shipments-list');
  if (!shipments.length) { el.innerHTML = '<p class="text-muted">No shipments assigned to you.</p>'; return; }
  el.innerHTML = `<div class="table-responsive"><table class="table">
    <thead><tr><th>ID</th><th>From</th><th>To</th><th>Type</th><th>Weight</th><th>Status</th></tr></thead>
    <tbody>
    ${shipments.map(s => `<tr>
      <td><code style="font-size:0.7rem">${s._id.slice(-8)}</code></td>
      <td>${truncate(s.pickupAddress, 25)}</td>
      <td>${truncate(s.dropAddress, 25)}</td>
      <td>${s.shipmentType}</td>
      <td>${s.weight}kg</td>
      <td>${statusBadge(s.status)}</td>
    </tr>`).join('')}
    </tbody></table></div>`;
}

async function loadDriverStatusPage() {
  const data = await api('GET', '/shipments');
  if (!data.success) return;
  const all = data.data.shipments;
  const active = all.filter(s => !['DELIVERED','FAILED'].includes(s.status));
  const delivered = all.filter(s => s.status === 'DELIVERED');

  const statusSel = document.getElementById('status-shipment-select');
  statusSel.innerHTML = '<option value="">-- Choose a shipment --</option>' +
    active.map(s => `<option value="${s._id}">[${s.status}] ${truncate(s.pickupAddress, 25)} → ${truncate(s.dropAddress, 20)}</option>`).join('');

  const proofSel = document.getElementById('proof-shipment-select');
  proofSel.innerHTML = '<option value="">-- Choose --</option>' +
    delivered.map(s => `<option value="${s._id}">${truncate(s.pickupAddress, 25)} → ${truncate(s.dropAddress, 20)}</option>`).join('');
}

async function doUpdateStatus() {
  clearAlert('status-update-alert');
  const id = document.getElementById('status-shipment-select').value;
  const status = document.getElementById('status-new').value;
  const note = document.getElementById('status-note').value;
  const locationText = document.getElementById('status-location').value;
  if (!id) return showAlert('status-update-alert', 'Select a shipment.');
  const data = await api('PUT', `/shipments/${id}/status`, { status, note, locationText });
  if (!data.success) return showAlert('status-update-alert', data.message);
  showAlert('status-update-alert', `Status updated to ${status}!`, 'success');
  loadDriverStatusPage();
  loadAssignedShipments();
}

async function doAddProof() {
  clearAlert('proof-alert');
  const id = document.getElementById('proof-shipment-select').value;
  const receiverName = document.getElementById('proof-receiver').value.trim();
  const confirmationNote = document.getElementById('proof-note').value.trim();
  if (!id) return showAlert('proof-alert', 'Select a shipment.');
  if (!receiverName) return showAlert('proof-alert', 'Receiver name is required.');
  const data = await api('POST', `/shipments/${id}/delivery-proof`, { receiverName, confirmationNote });
  if (!data.success) return showAlert('proof-alert', data.message);
  showAlert('proof-alert', 'Delivery proof added successfully!', 'success');
}

// ═══════════════════════════════════════════════════════════ ADMIN

async function loadAdminDashboard() {
  const [reportData, shipmentData, driverData] = await Promise.all([
    api('GET', '/admin/reports/fleet-utilization'),
    api('GET', '/shipments'),
    api('GET', '/drivers'),
  ]);

  if (reportData.success) {
    const r = reportData.data;
    document.getElementById('admin-stats').innerHTML = [
      { label: 'Total Vehicles',  val: r.vehicles.total,     color: 'primary' },
      { label: 'Available',       val: r.vehicles.available, color: 'success' },
      { label: 'Total Drivers',   val: r.drivers.total,      color: 'info' },
      { label: 'Active Shipments',val: r.shipments.active,   color: 'warning' },
      { label: 'Delivered',       val: r.shipments.delivered,color: 'success' },
      { label: 'Failed',          val: r.shipments.failed,   color: 'danger' },
    ].map(s => `<div class="col-6 col-md-4 col-lg-2">
      <div class="stat-card bg-${s.color} bg-opacity-10">
        <div class="stat-val text-${s.color}">${s.val}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    </div>`).join('');
  }

  if (shipmentData.success) {
    const recent = shipmentData.data.shipments.slice(0, 5);
    document.getElementById('admin-recent-shipments').innerHTML = recent.length
      ? recent.map(s => `<div class="d-flex justify-content-between mb-2">
          <span>${truncate(s.pickupAddress, 25)} → ${truncate(s.dropAddress, 20)}</span>
          ${statusBadge(s.status)}
        </div>`).join('')
      : '<p class="text-muted">No shipments yet.</p>';
  }

  if (driverData.success) {
    const drivers = driverData.data.drivers;
    document.getElementById('admin-driver-list').innerHTML = drivers.length
      ? drivers.map(d => `<div class="d-flex justify-content-between mb-2">
          <span>${d.userId?.name || '—'}</span>
          <span class="badge ${d.isAvailable ? 'bg-success' : 'bg-secondary'}">${d.isAvailable ? 'Available' : 'Busy'}</span>
        </div>`).join('')
      : '<p class="text-muted">No drivers yet.</p>';
  }
}

async function loadVehicles() {
  clearAlert('vehicles-alert');
  const data = await api('GET', '/vehicles');
  if (!data.success) return showAlert('vehicles-alert', data.message);
  const el = document.getElementById('vehicles-list');
  if (!data.data.vehicles.length) { el.innerHTML = '<p class="text-muted">No vehicles found.</p>'; return; }
  el.innerHTML = `<div class="table-responsive"><table class="table">
    <thead><tr><th>Type</th><th>Capacity</th><th>Status</th><th>Current Driver</th><th>Actions</th></tr></thead>
    <tbody>
    ${data.data.vehicles.map(v => `<tr>
      <td><i class="bi bi-truck me-1"></i>${v.type}</td>
      <td>${v.capacity}kg</td>
      <td>${statusBadge(v.status)}</td>
      <td>${v.currentDriverId ? (v.currentDriverId.userId?.name || 'Linked') : '—'}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick="openVehicleModal('${v._id}','${v.type}',${v.capacity},'${v.status}')">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deactivateVehicle('${v._id}')">Deactivate</button>
      </td>
    </tr>`).join('')}
    </tbody></table></div>`;
}

function openVehicleModal(id = '', type = 'TRUCK', capacity = 500, status = 'AVAILABLE') {
  document.getElementById('vm-id').value = id;
  document.getElementById('vm-type').value = type;
  document.getElementById('vm-capacity').value = capacity;
  document.getElementById('vm-status').value = status;
  document.getElementById('vm-status-group').style.display = id ? 'block' : 'none';
  document.getElementById('vehicle-modal-title').textContent = id ? 'Edit Vehicle' : 'Add Vehicle';
  clearAlert('vehicle-modal-alert');
}

async function saveVehicle() {
  clearAlert('vehicle-modal-alert');
  const id = document.getElementById('vm-id').value;
  const body = {
    type: document.getElementById('vm-type').value,
    capacity: parseInt(document.getElementById('vm-capacity').value),
  };
  if (id) body.status = document.getElementById('vm-status').value;

  const data = id
    ? await api('PUT', `/vehicles/${id}`, body)
    : await api('POST', '/vehicles', body);

  if (!data.success) return showAlert('vehicle-modal-alert', data.message);
  bootstrap.Modal.getInstance(document.getElementById('vehicleModal')).hide();
  loadVehicles();
}

async function deactivateVehicle(id) {
  if (!confirm('Deactivate this vehicle?')) return;
  const data = await api('DELETE', `/vehicles/${id}`);
  if (!data.success) return showAlert('vehicles-alert', data.message);
  showAlert('vehicles-alert', 'Vehicle deactivated.', 'success');
  loadVehicles();
}

async function loadDriversList() {
  clearAlert('drivers-alert');
  const data = await api('GET', '/drivers');
  if (!data.success) return showAlert('drivers-alert', data.message);
  const el = document.getElementById('drivers-list');
  if (!data.data.drivers.length) { el.innerHTML = '<p class="text-muted">No drivers found.</p>'; return; }
  el.innerHTML = `<div class="table-responsive"><table class="table">
    <thead><tr><th>Name</th><th>Email</th><th>License</th><th>Vehicle</th><th>Available</th></tr></thead>
    <tbody>
    ${data.data.drivers.map(d => `<tr>
      <td>${d.userId?.name || '—'}</td>
      <td>${d.userId?.email || '—'}</td>
      <td>${d.licenseNumber || '—'}</td>
      <td>${d.vehicleId ? d.vehicleId.type : '—'}</td>
      <td><span class="badge ${d.isAvailable ? 'bg-success' : 'bg-secondary'}">${d.isAvailable ? 'Yes' : 'No'}</span></td>
    </tr>`).join('')}
    </tbody></table></div>`;
}

function openDriverModal() {
  document.getElementById('dm-userId').value = '';
  document.getElementById('dm-license').value = '';
  document.getElementById('dm-phone').value = '';
  clearAlert('driver-modal-alert');
}

async function saveDriver() {
  clearAlert('driver-modal-alert');
  const userId = document.getElementById('dm-userId').value.trim();
  if (!userId) return showAlert('driver-modal-alert', 'User ID is required.');
  const body = {
    userId,
    licenseNumber: document.getElementById('dm-license').value.trim(),
    phone: document.getElementById('dm-phone').value.trim(),
  };
  const data = await api('POST', '/drivers', body);
  if (!data.success) return showAlert('driver-modal-alert', data.message);
  bootstrap.Modal.getInstance(document.getElementById('driverModal')).hide();
  loadDriversList();
}

async function loadAdminShipments() {
  clearAlert('admin-shipments-alert');
  const status = document.getElementById('admin-status-filter')?.value || '';
  const url = '/shipments' + (status ? `?status=${status}` : '');
  const data = await api('GET', url);
  if (!data.success) return showAlert('admin-shipments-alert', data.message);
  const el = document.getElementById('admin-shipments-list');
  if (!data.data.shipments.length) { el.innerHTML = '<p class="text-muted">No shipments found.</p>'; return; }
  el.innerHTML = `<div class="table-responsive"><table class="table table-sm">
    <thead><tr><th>ID</th><th>Customer</th><th>From</th><th>To</th><th>Type</th><th>Weight</th><th>Cost</th><th>Status</th><th>Driver</th></tr></thead>
    <tbody>
    ${data.data.shipments.map(s => `<tr>
      <td><code style="font-size:0.7rem">${s._id.slice(-8)}</code></td>
      <td>${s.customerId?.name || '—'}</td>
      <td>${truncate(s.pickupAddress, 20)}</td>
      <td>${truncate(s.dropAddress, 20)}</td>
      <td>${s.shipmentType}</td>
      <td>${s.weight}kg</td>
      <td>₹${s.cost}</td>
      <td>${statusBadge(s.status)}</td>
      <td>${s.assignedDriverId?.userId?.name || '—'}</td>
    </tr>`).join('')}
    </tbody></table></div>`;
}

async function loadAssignForm() {
  // Load BOOKED shipments
  const [shipData, driverData, vehicleData] = await Promise.all([
    api('GET', '/shipments?status=BOOKED'),
    api('GET', '/drivers?isAvailable=true'),
    api('GET', '/vehicles?status=AVAILABLE'),
  ]);

  if (shipData.success) {
    document.getElementById('assign-shipment-id').innerHTML =
      '<option value="">-- Select --</option>' +
      shipData.data.shipments.map(s =>
        `<option value="${s._id}">${truncate(s.pickupAddress, 25)} → ${truncate(s.dropAddress, 25)} (${s.weight}kg)</option>`
      ).join('');
  }
  if (driverData.success) {
    document.getElementById('assign-driver-id').innerHTML =
      '<option value="">-- Select --</option>' +
      driverData.data.drivers.map(d =>
        `<option value="${d._id}">${d.userId?.name || d._id}</option>`
      ).join('');
  }
  if (vehicleData.success) {
    document.getElementById('assign-vehicle-id').innerHTML =
      '<option value="">-- Select --</option>' +
      vehicleData.data.vehicles.map(v =>
        `<option value="${v._id}">${v.type} — ${v.capacity}kg capacity</option>`
      ).join('');
  }
  clearAlert('assign-alert');
}

async function doAssignShipment() {
  clearAlert('assign-alert');
  const id = document.getElementById('assign-shipment-id').value;
  const driverId = document.getElementById('assign-driver-id').value;
  const vehicleId = document.getElementById('assign-vehicle-id').value;
  if (!id || !driverId || !vehicleId) return showAlert('assign-alert', 'All fields are required.');
  const data = await api('PUT', `/shipments/${id}/assign`, { driverId, vehicleId });
  if (!data.success) return showAlert('assign-alert', data.message);
  showAlert('assign-alert', 'Shipment assigned successfully!', 'success');
  loadAssignForm();
}

async function loadTrips() {
  clearAlert('trips-alert');
  const data = await api('GET', '/trips');
  if (!data.success) return showAlert('trips-alert', data.message);
  const el = document.getElementById('trips-list');
  if (!data.data.trips.length) { el.innerHTML = '<p class="text-muted">No trips found.</p>'; return; }
  el.innerHTML = `<div class="table-responsive"><table class="table">
    <thead><tr><th>ID</th><th>Driver</th><th>Date</th><th>Shipments</th><th>Notes</th></tr></thead>
    <tbody>
    ${data.data.trips.map(t => `<tr>
      <td><code style="font-size:0.7rem">${t._id.slice(-8)}</code></td>
      <td>${t.driverId?.userId?.name || '—'}</td>
      <td>${fmtDate(t.date)}</td>
      <td>${t.shipmentIds?.length || 0} shipment(s)</td>
      <td>${t.notes || '—'}</td>
    </tr>`).join('')}
    </tbody></table></div>`;
}

async function openTripModal() {
  clearAlert('trip-modal-alert');
  const [driverData, shipData] = await Promise.all([
    api('GET', '/drivers'),
    api('GET', '/shipments'),
  ]);
  if (driverData.success) {
    document.getElementById('tm-driverId').innerHTML =
      '<option value="">-- Select --</option>' +
      driverData.data.drivers.map(d => `<option value="${d._id}">${d.userId?.name || d._id}</option>`).join('');
  }
  if (shipData.success) {
    const assignedShipments = shipData.data.shipments.filter(s => s.status === 'ASSIGNED');
    document.getElementById('tm-shipmentIds').innerHTML =
      assignedShipments.map(s => `<option value="${s._id}">${truncate(s.pickupAddress,20)} → ${truncate(s.dropAddress,20)}</option>`).join('');
  }
  document.getElementById('tm-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('tm-notes').value = '';
}

async function saveTrip() {
  clearAlert('trip-modal-alert');
  const driverId = document.getElementById('tm-driverId').value;
  const options = document.getElementById('tm-shipmentIds').selectedOptions;
  const shipmentIds = Array.from(options).map(o => o.value);
  const date = document.getElementById('tm-date').value;
  const notes = document.getElementById('tm-notes').value;
  if (!driverId || !shipmentIds.length || !date) {
    return showAlert('trip-modal-alert', 'Driver, date, and at least one shipment are required.');
  }
  const data = await api('POST', '/trips', { driverId, shipmentIds, date, notes });
  if (!data.success) return showAlert('trip-modal-alert', data.message);
  bootstrap.Modal.getInstance(document.getElementById('tripModal')).hide();
  loadTrips();
}

async function loadFleetReport() {
  const data = await api('GET', '/admin/reports/fleet-utilization');
  const el = document.getElementById('fleet-report-content');
  if (!data.success) { el.innerHTML = `<div class="alert-box show error">${data.message}</div>`; return; }
  const r = data.data;
  el.innerHTML = `
    <p class="text-muted small">Generated: ${fmtDate(r.generatedAt)}</p>
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="card p-3">
          <h6 class="fw-bold mb-3">Vehicles</h6>
          <table class="table table-sm mb-0">
            <tr><td>Total</td><td class="fw-bold">${r.vehicles.total}</td></tr>
            <tr><td>Available</td><td class="text-success fw-bold">${r.vehicles.available}</td></tr>
            <tr><td>Assigned</td><td class="text-warning fw-bold">${r.vehicles.assigned}</td></tr>
            <tr><td>Inactive</td><td class="text-secondary fw-bold">${r.vehicles.inactive}</td></tr>
            <tr><td>Utilization</td><td class="fw-bold">${r.vehicles.utilizationRate}</td></tr>
          </table>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card p-3">
          <h6 class="fw-bold mb-3">Drivers</h6>
          <table class="table table-sm mb-0">
            <tr><td>Total</td><td class="fw-bold">${r.drivers.total}</td></tr>
            <tr><td>Available</td><td class="text-success fw-bold">${r.drivers.available}</td></tr>
            <tr><td>Assigned</td><td class="text-warning fw-bold">${r.drivers.assigned}</td></tr>
            <tr><td>Utilization</td><td class="fw-bold">${r.drivers.utilizationRate}</td></tr>
          </table>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card p-3">
          <h6 class="fw-bold mb-3">Shipments</h6>
          <table class="table table-sm mb-0">
            <tr><td>Total</td><td class="fw-bold">${r.shipments.total}</td></tr>
            <tr><td>Booked</td><td class="fw-bold" style="color: var(--color-white);">${r.shipments.booked}</td></tr>
            <tr><td>In Progress</td><td class="fw-bold" style="color: var(--status-assigned-text);">${r.shipments.active}</td></tr>
            <tr><td>Delivered</td><td class="fw-bold" style="color: var(--status-delivered-text);">${r.shipments.delivered}</td></tr>
            <tr><td>Failed</td><td class="fw-bold" style="color: var(--status-failed-text);">${r.shipments.failed}</td></tr>
            <tr><td>Success Rate</td><td class="fw-bold">${r.shipments.deliverySuccessRate}</td></tr>
          </table>
        </div>
      </div>
    </div>
    ${r.vehicles.byType.length ? `
    <div class="card p-3">
      <h6 class="fw-bold mb-3">Vehicle Fleet by Type</h6>
      <div class="d-flex gap-3 flex-wrap">
        ${r.vehicles.byType.map(t => `
          <div class="stat-card" style="min-width:140px">
            <div class="stat-val">${t.count}</div>
            <div class="stat-label">${t._id}</div>
            <div class="text-muted" style="font-size:0.75rem">Total Capacity: ${t.totalCapacity}kg</div>
          </div>`).join('')}
      </div>
    </div>` : ''}
  `;
}
