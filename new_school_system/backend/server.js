const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// Import database connection and configuration
const { connectDB, checkDBHealth, initializeDatabase } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const schoolRoutes = require('./routes/schools');
const studentRoutes = require('./routes/students');
const studentReportRoutes = require('./routes/studentReports');
const aiAnalysisRoutes = require('./routes/aiAnalysis');
const meetingRecordRoutes = require('./routes/meetingRecord');

// Create Express app
const app = express();

// Connect to database
connectDB();

// Trust proxy (important for rate limiting behind reverse proxy/load balancer)
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : [
          'http://localhost:3000',
          'http://localhost:5173',
          'https://hk-teacher-system-4gty.vercel.app',
          'https://hk-teacher-system.vercel.app',
        ];

    // Add production domain when deployed
    if (process.env.CLIENT_URL) {
      allowedOrigins.push(process.env.CLIENT_URL);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Global rate limiting
const globalLimiter = rateLimit({
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,

  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health check endpoint
  skip: req => req.path === '/api/health',
});

app.use(globalLimiter);

// Body parsing middleware
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf);
      } catch {
        res.status(400).json({
          success: false,
          message: 'Invalid JSON format',
        });
        throw new Error('Invalid JSON');
      }
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

// Cookie parser middleware
app.use(cookieParser());

// Request logging middleware (simple version)
app.use((req, res, next) => {
  const start = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`
    );
  });

  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await checkDBHealth();

    res.status(200).json({
      success: true,
      message: 'Server is healthy',
      data: {
        server: 'OK',
        database: dbHealth,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Server health check failed',
      error: error.message,
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/student-reports', studentReportRoutes);
app.use('/api/ai-analysis', aiAnalysisRoutes);
app.use('/api/meeting-records', meetingRecordRoutes);

// API overview endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'HK Teacher Student Management System API',
    version: '1.0.0',
    endpoints: {
      authentication: {
        base: '/api/auth',
        routes: [
          'POST /api/auth/register - Register new teacher',
          'POST /api/auth/login - Login user',
          'POST /api/auth/logout - Logout user',
          'GET /api/auth/me - Get current user',
          'PUT /api/auth/updatedetails - Update user details',
          'PUT /api/auth/updatepassword - Update password',
          'POST /api/auth/forgotpassword - Forgot password',
          'PUT /api/auth/resetpassword/:token - Reset password',
        ],
      },
      schools: {
        base: '/api/schools',
        routes: [
          'GET /api/schools - Get all schools',
          'POST /api/schools - Create new school',
          'GET /api/schools/:id - Get single school',
          'PUT /api/schools/:id - Update school',
          'DELETE /api/schools/:id - Delete school (admin only)',
          'GET /api/schools/:id/stats - Get school statistics',
          'POST /api/schools/:id/teachers - Add teacher to school',
          'DELETE /api/schools/:id/teachers/:teacherId - Remove teacher from school',
          'POST /api/schools/:id/academic-years - Add academic year',
          'PUT /api/schools/:id/academic-years/:year/activate - Set active academic year',
        ],
      },
      students: {
        base: '/api/students',
        routes: [
          'GET /api/students - Get all students',
          'POST /api/students - Create new student',
          'GET /api/students/:id - Get single student',
          'PUT /api/students/:id - Update student',
          'DELETE /api/students/:id - Delete student',
          'GET /api/students/my-students - Get my students (teacher)',
          'GET /api/students/stats/:schoolId - Get student statistics by school',
          'POST /api/students/:id/teachers - Add teacher to student',
          'DELETE /api/students/:id/teachers/:teacherId - Remove teacher from student',
        ],
      },
      aiAnalysis: {
        base: '/api/ai-analysis',
        routes: [
          'GET /api/ai-analysis/stats - Get AI analysis statistics',
          'POST /api/ai-analysis/extract - Extract student data from file using AI',
          'POST /api/ai-analysis/import - Import extracted student data to database',
        ],
      },
    },
    documentation: 'See /docs for detailed API documentation',
  });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'HK Teacher Student Management System API',
    version: '2.0.0',
    endpoints: {
      authentication: {
        base: '/api/auth',
        routes: [
          'POST /api/auth/register - Register new teacher',
          'POST /api/auth/login - Login user',
          'POST /api/auth/logout - Logout user',
          'GET /api/auth/me - Get current user',
          'PUT /api/auth/updatedetails - Update user details',
          'PUT /api/auth/updatepassword - Update password',
          'POST /api/auth/forgotpassword - Forgot password',
          'PUT /api/auth/resetpassword/:token - Reset password',
        ],
      },
      schools: {
        base: '/api/schools',
        routes: [
          'GET /api/schools - Get all schools',
          'POST /api/schools - Create new school',
          'GET /api/schools/:id - Get single school',
          'PUT /api/schools/:id - Update school',
          'DELETE /api/schools/:id - Delete school (admin only)',
          'GET /api/schools/:id/stats - Get school statistics',
          'POST /api/schools/:id/teachers - Add teacher to school',
          'DELETE /api/schools/:id/teachers/:teacherId - Remove teacher from school',
          'POST /api/schools/:id/academic-years - Add academic year',
          'PUT /api/schools/:id/academic-years/:year/activate - Set active academic year',
        ],
      },
      students: {
        base: '/api/students',
        routes: [
          'GET /api/students - Get all students',
          'POST /api/students - Create new student',
          'GET /api/students/:id - Get single student',
          'PUT /api/students/:id - Update student',
          'DELETE /api/students/:id - Delete student',
          'GET /api/students/my-students - Get my students (teacher)',
          'GET /api/students/stats/:schoolId - Get student statistics by school',
          'POST /api/students/:id/teachers - Add teacher to student',
          'DELETE /api/students/:id/teachers/:teacherId - Remove teacher from student',
        ],
      },
      studentReports: {
        // ADD THIS SECTION
        base: '/api/student-reports',
        routes: [
          'GET /api/student-reports - Get all student reports',
          'POST /api/student-reports - Create new student report',
          'GET /api/student-reports/:id - Get single student report',
          'PUT /api/student-reports/:id - Update student report',
          'DELETE /api/student-reports/:id - Delete student report',
          'GET /api/student-reports/student/:studentId - Get reports by student',
          'GET /api/student-reports/my-reports - Get my reports (teacher)',
          'GET /api/student-reports/stats - Get report statistics',
          'PUT /api/student-reports/:id/submit - Submit report for review',
          'PUT /api/student-reports/:id/review - Review report (admin)',
          'PUT /api/student-reports/:id/approve - Approve report (admin)',
        ],
      },
    },
    aiAnalysis: {
      base: '/api/ai-analysis',
      routes: [
        'GET /api/ai-analysis/stats - Get AI analysis statistics',
        'POST /api/ai-analysis/extract - Extract student data from file using AI',
        'POST /api/ai-analysis/import - Import extracted student data to database',
      ],
    },

    documentation: 'See /docs for detailed API documentation',
  });
});

// Catch-all for undefined API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      '/api/auth/*',
      '/api/schools/*',
      '/api/students/*',
      '/api/student-reports/*',
      '/api/ai-analysis/*',
    ],
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'dist', 'index.html'));
  });
}

// Global error handling middleware
app.use((err, req, res, _next) => {
  console.error('Global error handler:', err);

  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    error = { message: 'CORS policy violation', statusCode: 403 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, _promise) => {
  console.error('Unhandled Promise Rejection:', err);

  // Close server & exit process
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');

  if (server) {
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');

  if (server) {
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
const PORT = process.env.PORT || 5001;

if (require.main === module) {
  const server = app.listen(PORT, async () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`📚 API Documentation available at http://localhost:${PORT}/api`);
  });

  server.on('error', error => {
    if (error.syscall !== 'listen') throw error;

    const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  });
} else {
  const server = app.listen(PORT, async () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`📚 API Documentation available at http://localhost:${PORT}/api`);
  });

  // Handle server startup errors
  server.on('error', error => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  });
}

module.exports = app;
