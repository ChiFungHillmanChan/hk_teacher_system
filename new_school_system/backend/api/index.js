// Replace your api/index.js with this:

module.exports = (req, res) => {
  console.log('🔍 Testing server import...');

  try {
    console.log('📦 Attempting to require server...');
    const app = require('../server');
    console.log('✅ Server imported successfully');

    // Try to use the app
    if (app && typeof app === 'function') {
      console.log('🎯 App is a function, calling it...');
      return app(req, res);
    } else if (app && app.handle) {
      console.log('🎯 App has handle method, using it...');
      return app.handle(req, res);
    } else {
      console.log('❓ App type:', typeof app);
      console.log('❓ App keys:', Object.keys(app || {}));

      res.status(200).json({
        success: true,
        message: 'Server imported but not callable',
        appType: typeof app,
        appKeys: Object.keys(app || {}),
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('❌ Error importing server:', error);
    console.error('Stack:', error.stack);

    res.status(500).json({
      success: false,
      message: 'Failed to import server',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }
};
