const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  addTeacherToStudent,
  removeTeacherFromStudent,
  getMyStudents,
  getStudentStatsBySchool,
  bulkUpdateStudents,
  advancedStudentSearch,
  getStudentProgression,
  promoteStudentsToNextYear,
  getAvailableAcademicYears,
} = require('../controllers/studentController');

const {
  protect,
  authorize,
  checkStudentAccess,
  logActivity,
  checkUserRateLimit,
} = require('../middleware/auth');

const { validateStudent, sanitizeInput } = require('../middleware/validation');

const { body, validationResult, param, query } = require('express-validator');

// Import StudentReport model for records functionality
const StudentReport = require('../models/StudentReport');

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

// Student Records Validation
const validateStudentRecord = [
  body('student').isMongoId().withMessage('Valid student ID is required'),

  body('school').isMongoId().withMessage('Valid school ID is required'),

  body('academicYear')
    .matches(/^\d{4}\/\d{2}$/)
    .withMessage('Academic year must be in format YYYY/YY'),

  body('grade')
    .isIn(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'])
    .withMessage('Invalid grade'),

  body('date').isISO8601().toDate().withMessage('Valid date is required'),

  body('topic').trim().isLength({ min: 1, max: 200 }).withMessage('Topic must be 1-200 characters'),

  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Content must be 1-1000 characters'),

  body('performance.rating')
    .isIn(['excellent', 'good', 'satisfactory', 'needs_improvement'])
    .withMessage('Invalid performance rating'),

  body('performance.notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Performance notes cannot exceed 500 characters'),

  body('homework.description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Homework description cannot exceed 500 characters'),

  body('homework.dueDate').optional().isISO8601().toDate().withMessage('Valid due date required'),

  body('homework.status')
    .optional()
    .isIn(['assigned', 'completed', 'overdue'])
    .withMessage('Invalid homework status'),

  body('remarks')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Remarks cannot exceed 500 characters'),
];

// Additional validation rules for teacher assignment
const validateAddTeacherToStudent = [
  body('teacherEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid teacher email'),

  body('subjects').optional().isArray().withMessage('Subjects must be an array'),

  body('isPrimaryTeacher').optional().isBoolean().withMessage('isPrimaryTeacher must be a boolean'),
];

// ========================================
// STUDENT RECORDS ROUTES
// ========================================

// @desc    Create new student record
// @route   POST /api/students/records
// @access  Private
router.post(
  '/records',
  generalLimiter,
  validateStudentRecord,
  logActivity('create_student_record'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      // Verify student exists and user has access
      const Student = require('../models/Student');
      const student = await Student.findById(req.body.student);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }

      // Check if user has access to this student
      if (req.user.role !== 'admin') {
        const hasSchoolAccess = req.user.schools.some(
          school => school.toString() === student.school.toString()
        );

        const isStudentTeacher = student.teachers.some(
          teacher => teacher.user.toString() === req.user._id.toString()
        );

        if (!hasSchoolAccess && !isStudentTeacher) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to create record for this student',
          });
        }
      }

      // Create the record with teacher ID from authenticated user
      const recordData = {
        ...req.body,
        teacher: req.user._id,
      };

      const record = new StudentReport(recordData);
      await record.save();

      // Populate the response
      const populatedRecord = await StudentReport.findById(record._id)
        .populate('student', 'name nameEn nameCh studentId grade class')
        .populate('school', 'name nameEn nameCh')
        .populate('teacher', 'name email');

      res.status(201).json({
        success: true,
        message: 'Student record created successfully',
        data: populatedRecord,
      });
    } catch (error) {
      console.error('Create student record error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error creating student record',
      });
    }
  }
);

router.get(
  '/search/advanced',
  generalLimiter,
  [
    query('schoolId').isMongoId().withMessage('Valid school ID is required'),
    query('academicYear')
      .optional()
      .matches(/^\d{4}\/\d{2}$/)
      .withMessage('Academic year must be in format YYYY/YY'),
    query('grade')
      .optional()
      .isIn(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'])
      .withMessage('Invalid grade'),
    query('includeHistory')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('includeHistory must be true or false'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
  logActivity('advanced_student_search'),
  advancedStudentSearch
);

router.post(
  '/promote-year',
  generalLimiter,
  [
    body('schoolId').isMongoId().withMessage('Valid school ID is required'),
    body('fromAcademicYear')
      .matches(/^\d{4}\/\d{2}$/)
      .withMessage('From academic year must be in format YYYY/YY'),
    body('toAcademicYear')
      .matches(/^\d{4}\/\d{2}$/)
      .withMessage('To academic year must be in format YYYY/YY'),
    body('promotions').isArray({ min: 1 }).withMessage('Promotions must be a non-empty array'),
    body('promotions.*.studentId')
      .isMongoId()
      .withMessage('Each promotion must have valid student ID'),
    body('promotions.*.newGrade')
      .isIn(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'])
      .withMessage('Invalid new grade'),
    body('promotions.*.newClass')
      .optional()
      .isLength({ max: 10 })
      .withMessage('Class name cannot exceed 10 characters'),
    body('promotions.*.newClassNumber')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Class number must be between 1 and 50'),
    body('promotions.*.promotionStatus')
      .optional()
      .isIn(['promoted', 'retained', 'transferred', 'graduated'])
      .withMessage('Invalid promotion status'),
  ],
  logActivity('promote_students_to_next_year'),
  promoteStudentsToNextYear
);

// @desc    Get all records for a specific student
// @route   GET /api/students/:studentId/records
// @access  Private
router.get(
  '/:studentId/records',
  generalLimiter,
  logActivity('get_student_records'),
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const { academicYear, limit = 50, page = 1, sort = 'date', order = 'desc' } = req.query;

      // Verify student exists and user has access
      const Student = require('../models/Student');
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found',
        });
      }

      // Check access permissions
      if (req.user.role !== 'admin') {
        const hasSchoolAccess = req.user.schools.some(
          school => school.toString() === student.school.toString()
        );

        const isStudentTeacher = student.teachers.some(
          teacher => teacher.user.toString() === req.user._id.toString()
        );

        if (!hasSchoolAccess && !isStudentTeacher) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to view records for this student',
          });
        }
      }

      // Build query
      const query = { student: studentId };
      if (academicYear) {
        query.academicYear = academicYear;
      }

      // Build sort object
      const sortObj = {};
      sortObj[sort] = order === 'desc' ? -1 : 1;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const records = await StudentReport.find(query)
        .populate('student', 'name nameEn nameCh studentId grade class')
        .populate('school', 'name nameEn nameCh')
        .populate('teacher', 'name email')
        .sort(sortObj)
        .limit(parseInt(limit))
        .skip(skip);

      const totalRecords = await StudentReport.countDocuments(query);

      res.json({
        success: true,
        data: {
          records,
          totalRecords,
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecords / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error('Get student records error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving student records',
      });
    }
  }
);

// @desc    Get single student record
// @route   GET /api/students/records/:recordId
// @access  Private
router.get(
  '/records/:recordId',
  generalLimiter,
  logActivity('get_student_record'),
  async (req, res) => {
    try {
      const record = await StudentReport.findById(req.params.recordId)
        .populate('student', 'name nameEn nameCh studentId grade class')
        .populate('school', 'name nameEn nameCh')
        .populate('teacher', 'name email');

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Record not found',
        });
      }

      // Check access permissions
      if (req.user.role !== 'admin') {
        const hasSchoolAccess = req.user.schools.some(
          school => school.toString() === record.school._id.toString()
        );

        const isRecordTeacher = record.teacher._id.toString() === req.user._id.toString();

        if (!hasSchoolAccess && !isRecordTeacher) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to view this record',
          });
        }
      }

      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      console.error('Get student record error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving student record',
      });
    }
  }
);

// Add this route BEFORE the individual student routes (before '/:id')
// @desc    Bulk update students for year summary
// @route   PUT /api/students/bulk-update
// @access  Private
router.put(
  '/bulk-update',
  generalLimiter,
  [
    body('updates')
      .isArray()
      .withMessage('Updates must be an array')
      .custom(updates => {
        if (updates.length === 0) {
          throw new Error('Updates array cannot be empty');
        }
        if (updates.length > 1000) {
          throw new Error('Cannot process more than 1000 updates at once');
        }
        return true;
      }),
    body('updates.*.id').isMongoId().withMessage('Each update must have a valid student ID'),
    body('updates.*.action')
      .isIn(['update', 'delete'])
      .withMessage('Action must be either update or delete'),
  ],
  logActivity('bulk_update_students'),
  bulkUpdateStudents
);

// @desc    Update student record
// @route   PUT /api/students/records/:recordId
// @access  Private
router.put(
  '/records/:recordId',
  generalLimiter,
  validateStudentRecord,
  logActivity('update_student_record'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const record = await StudentReport.findById(req.params.recordId);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Record not found',
        });
      }

      // Check if user can update this record
      if (req.user.role !== 'admin' && record.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this record',
        });
      }

      const updatedRecord = await StudentReport.findByIdAndUpdate(req.params.recordId, req.body, {
        new: true,
        runValidators: true,
      })
        .populate('student', 'name nameEn nameCh studentId grade class')
        .populate('school', 'name nameEn nameCh')
        .populate('teacher', 'name email');

      res.json({
        success: true,
        message: 'Student record updated successfully',
        data: updatedRecord,
      });
    } catch (error) {
      console.error('Update student record error:', error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// @desc    Delete student record
// @route   DELETE /api/students/records/:recordId
// @access  Private
router.delete(
  '/records/:recordId',
  generalLimiter,
  logActivity('delete_student_record'),
  async (req, res) => {
    try {
      const record = await StudentReport.findById(req.params.recordId);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Record not found',
        });
      }

      // Check if user can delete this record
      if (req.user.role !== 'admin' && record.teacher.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this record',
        });
      }

      await StudentReport.findByIdAndDelete(req.params.recordId);

      res.json({
        success: true,
        message: 'Student record deleted successfully',
      });
    } catch (error) {
      console.error('Delete student record error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error deleting student record',
      });
    }
  }
);

// ========================================
// EXISTING STUDENT ROUTES
// ========================================

// @desc    Get my students (for teachers)
// @route   GET /api/students/my-students
// @access  Private
router.get('/my-students', generalLimiter, logActivity('get_my_students'), getMyStudents);

// @desc    Get student statistics by school
// @route   GET /api/students/stats/:schoolId
// @access  Private
router.get(
  '/stats/:schoolId',
  generalLimiter,
  logActivity('get_student_stats'),
  getStudentStatsBySchool
);

// @desc    Get all students
// @route   GET /api/students
// @access  Private
router.get('/', generalLimiter, logActivity('get_students'), getStudents);

// @desc    Create new student
// @route   POST /api/students
// @access  Private
router.post('/', generalLimiter, validateStudent, logActivity('create_student'), createStudent);

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
router.get('/:id', generalLimiter, logActivity('get_student'), getStudent);

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private
router.put(
  '/:id',
  generalLimiter,
  checkStudentAccess,
  validateStudent,
  logActivity('update_student'),
  updateStudent
);

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private
router.delete(
  '/:id',
  generalLimiter,
  checkStudentAccess,
  logActivity('delete_student'),
  deleteStudent
);

// Teacher Assignment Routes

// @desc    Add teacher to student
// @route   POST /api/students/:id/teachers
// @access  Private
router.post(
  '/:id/teachers',
  generalLimiter,
  checkStudentAccess,
  validateAddTeacherToStudent,
  logActivity('add_teacher_to_student'),
  addTeacherToStudent
);

// @desc    Remove teacher from student
// @route   DELETE /api/students/:id/teachers/:teacherId
// @access  Private
router.delete(
  '/:id/teachers/:teacherId',
  generalLimiter,
  checkStudentAccess,
  logActivity('remove_teacher_from_student'),
  removeTeacherFromStudent
);

router.get(
  '/:id/progression',
  generalLimiter,
  logActivity('get_student_progression'),
  getStudentProgression
);

// Debug routes for development
if (process.env.NODE_ENV === 'development') {
  // @desc    Get all students (admin debug)
  // @route   GET /api/students/debug/all
  // @access  Private (Admin only)
  router.get('/debug/all', authorize('admin'), async (req, res) => {
    try {
      const Student = require('../models/Student');
      const students = await Student.find({})
        .populate('school', 'name nameEn nameCh')
        .populate('teachers.user', 'name email')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        count: students.length,
        data: students,
      });
    } catch (error) {
      console.error('Debug get all students error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  });
}

module.exports = router;
