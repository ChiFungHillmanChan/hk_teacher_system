const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import controllers and middleware
const {
  getStudentReports,
  getStudentReport,
  createStudentReport,
  updateStudentReport,
  deleteStudentReport,
  getReportsByStudent,
  getMyReports,
  submitReport,
  reviewReport,
  approveReport,
  getReportStats,
} = require('../controllers/studentReportController');

const {
  protect,
  authorize,
  checkReportAccess,
  logActivity,
  checkUserRateLimit,
} = require('../middleware/auth');

const { sanitizeInput } = require('../middleware/validation');

const { body, param, query } = require('express-validator');

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

const createLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit report creation to 10 per 5 minutes
  message: {
    success: false,
    message: 'Too many report creations, please try again later.',
  },
});

// Apply middleware to all routes
router.use(protect); // All routes require authentication
router.use(sanitizeInput);
router.use(checkUserRateLimit);

// Validation rules for student reports
const validateCreateStudentReport = [
  body('student').isMongoId().withMessage('Valid student ID is required'),

  body('school').optional().isMongoId().withMessage('School must be a valid ID'),

  body('academicYear')
    .matches(/^\d{4}\/\d{2}$/)
    .withMessage('Academic year must be in format YYYY/YY (e.g., 2025/26)'),

  body('reportDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Report date must be a valid date'),

  body('term')
    .optional()
    .isIn(['term1', 'term2', 'term3', 'midterm', 'final', 'continuous'])
    .withMessage('Term must be term1, term2, term3, midterm, final, or continuous'),

  body('subject.name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Subject name is required and must be between 1-100 characters'),

  body('subject.teacher')
    .optional()
    .isMongoId()
    .withMessage('Subject teacher must be a valid user ID'),

  body('subjectDetails.topic')
    .isLength({ min: 1, max: 200 })
    .withMessage('Topic is required and must be between 1-200 characters'),

  body('subjectDetails.duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be at least 1 minute'),

  body('performance.attendance.status')
    .optional()
    .isIn(['present', 'absent', 'late', 'early_leave'])
    .withMessage('Attendance status must be present, absent, late, or early_leave'),

  body('performance.participation.level')
    .optional()
    .isIn(['excellent', 'good', 'fair', 'poor', 'not_applicable'])
    .withMessage('Participation level must be excellent, good, fair, poor, or not_applicable'),

  body('performance.understanding.level')
    .optional()
    .isIn(['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'])
    .withMessage(
      'Understanding level must be excellent, good, satisfactory, needs_improvement, or poor'
    ),

  body('behavior.conduct')
    .optional()
    .isIn(['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'])
    .withMessage('Conduct must be excellent, good, satisfactory, needs_improvement, or poor'),

  body('status')
    .optional()
    .isIn(['draft', 'submitted', 'reviewed', 'approved', 'archived'])
    .withMessage('Status must be draft, submitted, reviewed, approved, or archived'),
];

// Routes

router.get(
  '/year-summary/:schoolId',
  generalLimiter,
  [
    param('schoolId').isMongoId().withMessage('Valid school ID is required'),
    query('gradeRange')
      .optional()
      .isIn(['grades-1-5', 'grade-6', 'all'])
      .withMessage('Grade range must be grades-1-5, grade-6, or all'),
    query('academicYear')
      .optional()
      .matches(/^\d{4}\/\d{2}$/)
      .withMessage('Academic year must be in format YYYY/YY'),
  ],
  logActivity('get_year_summary_data'),
  async (req, res) => {
    try {
      const { schoolId } = req.params;
      const { gradeRange = 'all', academicYear } = req.query;

      // Verify school access
      const school = await require('../models/School').findById(schoolId);
      if (!school) {
        return res.status(404).json({
          success: false,
          message: 'School not found',
        });
      }

      // Check user permissions
      if (req.user.role !== 'admin') {
        const hasAccess = req.user.schools.some(
          userSchool => userSchool.toString() === schoolId.toString()
        );
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to access this school',
          });
        }
      }

      // Get students for year summary
      const Student = require('../models/Student');
      const students = await Student.getForYearSummary(schoolId, gradeRange, {
        academicYear
      });

      res.status(200).json({
        success: true,
        data: {
          school: {
            id: school._id,
            name: school.name,
            schoolType: school.schoolType
          },
          students,
          summary: {
            total: students.length,
            byGrade: students.reduce((acc, student) => {
              acc[student.grade] = (acc[student.grade] || 0) + 1;
              return acc;
            }, {})
          }
        },
      });
    } catch (error) {
      console.error('Get year summary data error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving year summary data',
      });
    }
  }
);

// @desc    Get report statistics
// @route   GET /api/student-reports/stats
// @access  Private
router.get('/stats', generalLimiter, logActivity('get_report_stats'), getReportStats);

// @desc    Get my reports (for teachers)
// @route   GET /api/student-reports/my-reports
// @access  Private
router.get('/my-reports', generalLimiter, logActivity('get_my_reports'), getMyReports);

// @desc    Get reports by student
// @route   GET /api/student-reports/student/:studentId
// @access  Private
router.get(
  '/student/:studentId',
  generalLimiter,
  logActivity('get_reports_by_student'),
  getReportsByStudent
);

// @desc    Get all student reports
// @route   GET /api/student-reports
// @access  Private
router.get('/', generalLimiter, logActivity('get_student_reports'), getStudentReports);

// @desc    Create new student report
// @route   POST /api/student-reports
// @access  Private
router.post(
  '/',
  createLimiter,
  validateCreateStudentReport,
  logActivity('create_student_report'),
  createStudentReport
);

// @desc    Get single student report
// @route   GET /api/student-reports/:id
// @access  Private
router.get(
  '/:id',
  generalLimiter,
  checkReportAccess,
  logActivity('get_student_report'),
  getStudentReport
);

// @desc    Update student report
// @route   PUT /api/student-reports/:id
// @access  Private
router.put(
  '/:id',
  generalLimiter,
  checkReportAccess,
  validateCreateStudentReport,
  logActivity('update_student_report'),
  updateStudentReport
);

// @desc    Delete student report
// @route   DELETE /api/student-reports/:id
// @access  Private
router.delete(
  '/:id',
  generalLimiter,
  checkReportAccess,
  logActivity('delete_student_report'),
  deleteStudentReport
);

// Report Status Management Routes

// @desc    Submit report for review
// @route   PUT /api/student-reports/:id/submit
// @access  Private
router.put(
  '/:id/submit',
  generalLimiter,
  checkReportAccess,
  logActivity('submit_report'),
  submitReport
);

// @desc    Review report
// @route   PUT /api/student-reports/:id/review
// @access  Private
router.put(
  '/:id/review',
  generalLimiter,
  authorize('admin'), // Only admins can review reports
  checkReportAccess,
  logActivity('review_report'),
  reviewReport
);

// @desc    Approve report
// @route   PUT /api/student-reports/:id/approve
// @access  Private
router.put(
  '/:id/approve',
  generalLimiter,
  authorize('admin'), // Only admins can approve reports
  checkReportAccess,
  logActivity('approve_report'),
  approveReport
);

module.exports = router;
