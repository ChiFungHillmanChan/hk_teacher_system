const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import controllers and middleware
const {
  getSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool,
  addTeacherToSchool,
  removeTeacherFromSchool,
  addAcademicYear,
  setActiveAcademicYear,
  getSchoolStats,
} = require('../controllers/schoolController');

const { protect, authorize, logActivity, checkUserRateLimit } = require('../middleware/auth');

const { validateSchool, validateUpdateSchool, sanitizeInput } = require('../middleware/validation');

const { body } = require('express-validator');

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

// Apply middleware to all routes
router.use(protect); // All routes require authentication
router.use(sanitizeInput);
router.use(checkUserRateLimit);

// Teacher validation rules for adding teachers to schools
const validateAddTeacher = [
  body('teacherEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid teacher email'),

  body('role')
    .optional()
    .isIn(['teacher', 'head_teacher'])
    .withMessage('Role must be teacher or head_teacher'),

  body('subjects').optional().isArray().withMessage('Subjects must be an array'),

  body('grades').optional().isArray().withMessage('Grades must be an array'),
];

// Academic year validation rules
const validateAcademicYear = [
  body('year')
    .matches(/^\d{4}\/\d{2}$/)
    .withMessage('Academic year must be in format YYYY/YY (e.g., 2025/26)'),

  body('startDate').optional().isISO8601().toDate().withMessage('Start date must be a valid date'),

  body('endDate').optional().isISO8601().toDate().withMessage('End date must be a valid date'),
];

// Routes

// @desc    Get all schools
// @route   GET /api/schools
// @access  Private
router.get('/', generalLimiter, logActivity('get_schools'), getSchools);

// @desc    Create new school
// @route   POST /api/schools
// @access  Private
router.post('/', generalLimiter, validateSchool, logActivity('create_school'), createSchool);

// @desc    Get single school
// @route   GET /api/schools/:id
// @access  Private
router.get('/:id', generalLimiter, logActivity('get_school'), getSchool);

// @desc    Update school
// @route   PUT /api/schools/:id
// @access  Private (Head Teacher or Admin)
router.put(
  '/:id',
  generalLimiter,
  validateUpdateSchool,
  logActivity('update_school'),
  updateSchool
);

// @desc    Delete school
// @route   DELETE /api/schools/:id
// @access  Private (Admin only)
router.delete(
  '/:id',
  generalLimiter,
  authorize('admin'),
  logActivity('delete_school'),
  deleteSchool
);

// @desc    Get school statistics
// @route   GET /api/schools/:id/stats
// @access  Private
router.get('/:id/stats', generalLimiter, logActivity('get_school_stats'), getSchoolStats);

// Teacher Management Routes

// @desc    Add teacher to school
// @route   POST /api/schools/:id/teachers
// @access  Private (Head Teacher or Admin)
router.post(
  '/:id/teachers',
  generalLimiter,
  validateAddTeacher,
  logActivity('add_teacher_to_school'),
  addTeacherToSchool
);

// @desc    Remove teacher from school
// @route   DELETE /api/schools/:id/teachers/:teacherId
// @access  Private (Head Teacher or Admin)
router.delete(
  '/:id/teachers/:teacherId',
  generalLimiter,
  logActivity('remove_teacher_from_school'),
  removeTeacherFromSchool
);

// Academic Year Management Routes

// @desc    Add academic year to school
// @route   POST /api/schools/:id/academic-years
// @access  Private (Head Teacher or Admin)
router.post(
  '/:id/academic-years',
  generalLimiter,
  validateAcademicYear,
  logActivity('add_academic_year'),
  addAcademicYear
);

// @desc    Set active academic year
// @route   PUT /api/schools/:id/academic-years/:year/activate
// @access  Private (Head Teacher or Admin)
router.put(
  '/:id/academic-years/:year/activate',
  generalLimiter,
  logActivity('set_active_academic_year'),
  setActiveAcademicYear
);

module.exports = router;
