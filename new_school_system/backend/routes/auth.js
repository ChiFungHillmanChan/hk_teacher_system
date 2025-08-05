// File: routes/auth.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

// Import controllers and middleware
const {
  verifyInviteCode,
  register,
  login,
  logout,
  logoutAll,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  refreshToken,
} = require('../controllers/authController');

const { protect, authorize, logActivity, checkUserRateLimit } = require('../middleware/auth');

const {
  validateRegister,
  validateLogin,
  validateUpdateDetails,
  validateUpdatePassword,
  validateForgotPassword,
  validateResetPassword,
  validateInviteCode,
  sanitizeInput,
} = require('../middleware/validation');

// Rate limiting configurations
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  skip: req =>
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
    req.ip === '127.0.0.1',
});
//   max: 5, // limit each IP to 5 requests per windowMs
//   message: {
//     success: false,
//     message: 'Too many authentication attempts, please try again later.',
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordLimiter =
  process.env.NODE_ENV === 'development'
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10,
        message: {
          success: false,
          message: 'Too many password reset attempts, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
      });

// Apply sanitization to all routes
router.use(sanitizeInput);

// DEBUG ROUTES - PLACE BEFORE PROTECTED ROUTES (only in development)
if (process.env.NODE_ENV === 'development') {
  // Debug route to check users
  router.get('/debug/users', async (req, res) => {
    try {
      const User = require('../models/User');
      const users = await User.find({}).select('-password -refreshTokens');
      res.json({
        success: true,
        count: users.length,
        data: users,
      });
    } catch (error) {
      console.error('Debug users error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // Debug route to create admin user
  router.post('/debug/create-admin', async (req, res) => {
    try {
      const User = require('../models/User');

      // Check if admin already exists
      const existingAdmin = await User.findOne({ email: 'admin@hkteacher.dev' });
      if (existingAdmin) {
        return res.json({
          success: true,
          message: 'Admin user already exists',
          user: {
            id: existingAdmin._id,
            email: existingAdmin.email,
            role: existingAdmin.role,
            isActive: existingAdmin.isActive,
          },
        });
      }

      // Create new admin
      const adminUser = new User({
        name: 'System Administrator',
        email: 'admin@hkteacher.dev',
        password: 'Admin123!@#',
        role: 'admin',
        emailVerified: true,
        isActive: true,
      });

      await adminUser.save();

      res.json({
        success: true,
        message: 'Admin user created successfully',
        user: {
          id: adminUser._id,
          email: adminUser.email,
          role: adminUser.role,
          isActive: adminUser.isActive,
        },
      });
    } catch (error) {
      console.error('Create admin error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      });
    }
  });
}

// ========================================
// PUBLIC ROUTES (NO AUTHENTICATION REQUIRED)
// ========================================

router.post('/verify-invite', authLimiter, validateInviteCode, verifyInviteCode);
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/forgotpassword', passwordLimiter, validateForgotPassword, forgotPassword);
router.put('/resetpassword/:resettoken', passwordLimiter, validateResetPassword, resetPassword);
router.get('/verify/:token', verifyEmail);
router.post('/refresh', refreshToken);

// ========================================
// PROTECTED ROUTES (AUTHENTICATION REQUIRED)
// ========================================

// Apply authentication middleware to all routes below
router.use(protect);
router.use(checkUserRateLimit);

// User profile routes
router.get('/me', generalLimiter, logActivity('get_profile'), getMe);
router.put(
  '/updatedetails',
  generalLimiter,
  validateUpdateDetails,
  logActivity('update_profile'),
  updateDetails
);
router.put(
  '/updatepassword',
  passwordLimiter,
  validateUpdatePassword,
  logActivity('update_password'),
  updatePassword
);

// Logout routes
router.post('/logout', generalLimiter, logout);
router.post('/logout-all', generalLimiter, logoutAll);

// Email verification
router.post('/resend-verification', generalLimiter, resendVerification);

module.exports = router;
