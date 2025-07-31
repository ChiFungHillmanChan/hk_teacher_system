const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies (for browser requests)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'No user found with this token',
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated',
        });
      }

      // Check if user account is locked
      if (user.isLocked) {
        return res.status(401).json({
          success: false,
          message: 'User account is temporarily locked due to multiple failed login attempts',
        });
      }

      // Add user to request object
      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
        });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Not authorized to access this route',
        });
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication',
    });
  }
};

// Middleware to grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }

    next();
  };
};

// Middleware to check if user belongs to specific school
const checkSchoolAccess = async (req, res, next) => {
  try {
    const schoolId = req.params.schoolId || req.body.school;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required',
      });
    }

    // Admin users have access to all schools
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user belongs to the school
    const hasAccess = req.user.schools.some(school => school.toString() === schoolId.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this school',
      });
    }

    next();
  } catch (error) {
    console.error('School access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in school access check',
    });
  }
};

// Middleware to check if user can access specific student
const checkStudentAccess = async (req, res, next) => {
  try {
    const Student = require('../models/Student');
    const studentId = req.params.studentId || req.body.student;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required',
      });
    }

    // Get student data
    const student = await Student.findById(studentId).populate('school');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Admin users have access to all students
    if (req.user.role === 'admin') {
      req.student = student;
      return next();
    }

    // Check if user belongs to the student's school
    const hasSchoolAccess = req.user.schools.some(
      school => school.toString() === student.school._id.toString()
    );

    // Check if user is assigned as teacher to this student
    const isStudentTeacher = student.teachers.some(
      teacher => teacher.user.toString() === req.user._id.toString()
    );

    if (!hasSchoolAccess && !isStudentTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this student',
      });
    }

    req.student = student;
    next();
  } catch (error) {
    console.error('Student access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in student access check',
    });
  }
};

// Middleware to check if user can access specific report
const checkReportAccess = async (req, res, next) => {
  try {
    const StudentReport = require('../models/StudentReport');
    const reportId = req.params.reportId || req.params.id;

    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: 'Report ID is required',
      });
    }

    // Get report data
    const report = await StudentReport.findById(reportId)
      .populate('student', 'school teachers')
      .populate('school');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Admin users have access to all reports
    if (req.user.role === 'admin') {
      req.report = report;
      return next();
    }

    // Check if user is the report creator
    if (report.createdBy.toString() === req.user._id.toString()) {
      req.report = report;
      return next();
    }

    // Check if user is the subject teacher
    if (report.subject.teacher.toString() === req.user._id.toString()) {
      req.report = report;
      return next();
    }

    // Check if user belongs to the same school
    const hasSchoolAccess = req.user.schools.some(
      school => school.toString() === report.school._id.toString()
    );

    // Check if user is assigned as teacher to the student
    const isStudentTeacher = report.student.teachers.some(
      teacher => teacher.user.toString() === req.user._id.toString()
    );

    if (!hasSchoolAccess && !isStudentTeacher) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this report',
      });
    }

    req.report = report;
    next();
  } catch (error) {
    console.error('Report access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in report access check',
    });
  }
};

// Middleware to validate refresh token
const validateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token type',
        });
      }

      // Get user and check if refresh token exists
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'No user found with this token',
        });
      }

      // Check if refresh token exists in user's refresh tokens
      const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);

      if (!tokenExists) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated',
        });
      }

      req.user = user;
      req.refreshToken = refreshToken;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
        });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Refresh token expired',
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
        });
      }
    }
  } catch (error) {
    console.error('Refresh token validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in refresh token validation',
    });
  }
};

// Middleware to log user activities
const logActivity = action => {
  return (req, res, next) => {
    // Store activity information in request for later logging
    req.activityLog = {
      user: req.user ? req.user._id : null,
      action: action,
      resource: req.originalUrl,
      method: req.method,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
    };

    // Continue to next middleware
    next();

    // Note: Actual logging would be implemented in a separate service
    // This could be extended to save to database or send to logging service
  };
};

// Middleware to check API rate limits per user
const checkUserRateLimit = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // This is a simple in-memory rate limiting example
    // In production, you'd want to use Redis or similar
    const userId = req.user._id.toString();
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 1000; // per window

    // Initialize user rate limit data if not exists
    if (!global.userRateLimits) {
      global.userRateLimits = new Map();
    }

    const userLimitData = global.userRateLimits.get(userId) || {
      count: 0,
      windowStart: now,
    };

    // Reset window if expired
    if (now - userLimitData.windowStart > windowMs) {
      userLimitData.count = 0;
      userLimitData.windowStart = now;
    }

    // Check if user exceeded rate limit
    if (userLimitData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((windowMs - (now - userLimitData.windowStart)) / 1000),
      });
    }

    // Increment counter
    userLimitData.count++;
    global.userRateLimits.set(userId, userLimitData);

    next();
  } catch (error) {
    console.error('User rate limit check error:', error);
    // Don't block request on rate limit error
    next();
  }
};

module.exports = {
  protect,
  authorize,
  checkSchoolAccess,
  checkStudentAccess,
  checkReportAccess,
  validateRefreshToken,
  logActivity,
  checkUserRateLimit,
};
