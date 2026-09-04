require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');


// Route imports
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const driverRoutes = require('./routes/driverRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const tripRoutes = require('./routes/tripRoutes');
const reportRoutes = require('./routes/reportRoutes');
const pricingRoutes = require('./routes/pricingRoutes');

const app = express();


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/pricing', pricingRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logistics Fleet System is running.',
    data: { timestamp: new Date() },
  });
});

// Serve frontend for any non-API route (SPA)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ success: false, message: 'API route not found.', errorCode: 'NOT_FOUND' });
  }
});

// Centralized error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`🚚 Logistics Fleet System running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

module.exports = app;
