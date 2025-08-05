// Move your entire server.js content to api/index.js
// OR replace api/index.js with this:

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// Import your existing routes
const authRoutes = require('../routes/auth');
const schoolRoutes = require('../routes/schools');
const studentRoutes = require('../routes/students');
const studentReportRoutes = require('../routes/studentReports');
const aiAnalysisRoutes = require('../routes/aiAnalysis');
const meetingRecordRoutes = require('../routes/meetingRecord');

const app = express();

// Your existing middleware and configurations...
// (Copy everything from your server.js)

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API working from api/index.js!',
    timestamp: new Date().toISOString(),
  });
});

// Export for Vercel
module.exports = app;
