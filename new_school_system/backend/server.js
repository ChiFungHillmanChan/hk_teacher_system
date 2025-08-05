const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all origins (temporary for testing)
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json());

// Test endpoints
app.get('/api/test', (req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({
    success: true,
    message: 'Test endpoint working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vercel: process.env.VERCEL || 'false',
  });
});

app.get('/api/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'HK Teacher API - Minimal Version',
    timestamp: new Date().toISOString(),
    endpoints: ['/api/test', '/api/health'],
  });
});

// Catch all
app.get('*', (req, res) => {
  res.json({
    success: false,
    message: 'Route not found',
    path: req.path,
    availableRoutes: ['/api', '/api/test', '/api/health'],
  });
});

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`🚀 Minimal server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 Vercel: ${process.env.VERCEL || 'false'}`);
});

module.exports = app;
