// Temporarily replace your api/index.js with this for debugging:

console.log('🚀 Starting api/index.js...');

try {
  console.log('📦 Attempting to import server.js...');
  const app = require('../server');
  console.log('✅ Server.js imported successfully');

  // Add a simple test route directly here
  app.get('/api/debug', (req, res) => {
    console.log('🐛 Debug endpoint called');
    res.json({
      success: true,
      message: 'Debug endpoint working',
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL,
    });
  });

  console.log('✅ Debug route added');
  console.log('🎯 Exporting app...');

  module.exports = app;
} catch (error) {
  console.error('❌ Error in api/index.js:', error);
  console.error('Stack trace:', error.stack);

  // Fallback simple app
  const express = require('express');
  const fallbackApp = express();

  fallbackApp.get('*', (req, res) => {
    res.json({
      success: false,
      message: 'Server failed to start',
      error: error.message,
      path: req.path,
    });
  });

  module.exports = fallbackApp;
}
