const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const {
  getMeetingRecords,
  getMeetingRecord,
  createMeetingRecord,
  updateMeetingRecord,
  deleteMeetingRecord,
  getMeetingsByStudent,
  getMeetingStats,
  getMeetingsByYear,
} = require('../controllers/meetingRecordController');

const { protect, authorize, logActivity, checkUserRateLimit } = require('../middleware/auth');
const { sanitizeInput } = require('../middleware/validation');
const { body, param, query } = require('express-validator');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const createLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit meeting creation to 20 per 5 minutes
  message: {
    success: false,
    message: 'Too many meeting record creations, please try again later.',
  },
});

router.use(protect);
router.use(sanitizeInput);
router.use(checkUserRateLimit);

// HK SEN Categories for validation
const SEN_CATEGORIES = [
  '注意力不足/過度活躍症', // ADHD
  '自閉症譜系障礙', // Autism Spectrum Disorder
  '聽力障礙', // Hearing Impairment
  '精神疾病', // Mental Illness
  '肢體傷殘', // Physical Disability
  '特殊學習困難', // Specific Learning Difficulties
  '言語障礙', // Speech and Language Impairment
  '視覺障礙', // Visual Impairment
  '智力障礙', // Intellectual Disability
  '其他', // Others
  '沒有', // None
];

const SUPPORT_LEVELS = ['第一層', '第二層', '第三層', '其他', '沒有'];

// Validation for meeting records
const validateMeetingRecord = [
  // Required fields for both regular and IEP
  body('student').isMongoId().withMessage('Valid student ID is required'),

  body('school').optional().isMongoId().withMessage('School must be a valid ID'),

  body('academicYear')
    .matches(/^\d{4}\/\d{2}$/)
    .withMessage('Academic year must be in format YYYY/YY'),

  body('meetingType').isIn(['regular', 'iep']).withMessage('Meeting type must be regular or iep'),

  body('meetingTitle')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Meeting title is required and must be 1-200 characters'),

  body('meetingDate').isISO8601().toDate().withMessage('Valid meeting date is required'),

  body('endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),

  body('participants')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Participants list is required and must be 1-2000 characters'),

  body('meetingLocation')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Meeting location is required and must be 1-200 characters'),

  body('senCategories')
    .isArray({ min: 1 })
    .withMessage('At least one SEN category must be selected')
    .custom(categories => {
      for (const category of categories) {
        if (!SEN_CATEGORIES.includes(category)) {
          throw new Error(`Invalid SEN category: ${category}`);
        }
      }
      return true;
    }),

  body('meetingContent')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Meeting content is required and must be 1-5000 characters'),

  // IEP-specific required field
  body('supportLevel')
    .if(body('meetingType').equals('iep'))
    .isIn(SUPPORT_LEVELS)
    .withMessage('Support level is required for IEP meetings and must be a valid option'),

  // Optional fields with length validation
  body('senCategoriesOther')
    .optional({ checkFalsy: true })
    .isLength({ max: 500 })
    .withMessage('SEN categories other description cannot exceed 500 characters'),

  body('remarks')
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('Remarks cannot exceed 2000 characters'),

  // IEP optional fields
  body('currentLearningStatus')
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('Current learning status cannot exceed 2000 characters'),

  body('curriculumAdaptation')
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('Curriculum adaptation cannot exceed 2000 characters'),

  body('teachingAdaptation')
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('Teaching adaptation cannot exceed 2000 characters'),

  body('peerSupport')
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('Peer support cannot exceed 2000 characters'),

  body('teacherCollaboration')
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('Teacher collaboration cannot exceed 2000 characters'),

  body('classroomManagement')
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('Classroom management cannot exceed 2000 characters'),

  body('assessmentAdaptation')
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('Assessment adaptation cannot exceed 2000 characters'),

  body('homeworkAdaptation')
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('Homework adaptation cannot exceed 2000 characters'),

  body('teacherRecommendations')
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('Teacher recommendations cannot exceed 2000 characters'),

  body('parentRecommendations')
    .optional({ checkFalsy: true })
    .isLength({ max: 2000 })
    .withMessage('Parent recommendations cannot exceed 2000 characters'),

  body('attachments').optional().isArray().withMessage('Attachments must be an array'),
];

// Routes

// @desc    Get meeting statistics
// @route   GET /api/meeting-records/stats
// @access  Private
router.get('/stats', generalLimiter, logActivity('get_meeting_stats'), getMeetingStats);

// @desc    Get meetings by academic year and school
// @route   GET /api/meeting-records/by-year/:schoolId/:academicYear
// @access  Private
router.get(
  '/by-year/:schoolId/:academicYear',
  generalLimiter,
  [
    param('schoolId').isMongoId().withMessage('Valid school ID is required'),
    param('academicYear')
      .matches(/^\d{4}\/\d{2}$/)
      .withMessage('Academic year must be in format YYYY/YY'),
    query('meetingType')
      .optional()
      .isIn(['regular', 'iep'])
      .withMessage('Meeting type must be regular or iep'),
  ],
  logActivity('get_meetings_by_year'),
  getMeetingsByYear
);

// @desc    Get meetings by student
// @route   GET /api/meeting-records/student/:studentId
// @access  Private
router.get(
  '/student/:studentId',
  generalLimiter,
  [
    param('studentId').isMongoId().withMessage('Valid student ID is required'),
    query('meetingType')
      .optional()
      .isIn(['regular', 'iep'])
      .withMessage('Meeting type must be regular or iep'),
    query('academicYear')
      .optional()
      .matches(/^\d{4}\/\d{2}$/)
      .withMessage('Academic year must be in format YYYY/YY'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 5000 })
      .withMessage('Limit must be between 1 and 5000'),
  ],
  logActivity('get_meetings_by_student'),
  getMeetingsByStudent
);

// @desc    Get all meeting records
// @route   GET /api/meeting-records
// @access  Private
router.get(
  '/',
  generalLimiter,
  [
    query('student').optional().isMongoId().withMessage('Student ID must be valid'),
    query('school').optional().isMongoId().withMessage('School ID must be valid'),
    query('academicYear')
      .optional()
      .matches(/^\d{4}\/\d{2}$/)
      .withMessage('Academic year must be in format YYYY/YY'),
    query('meetingType')
      .optional()
      .isIn(['regular', 'iep'])
      .withMessage('Meeting type must be regular or iep'),
    query('status')
      .optional()
      .isIn(['draft', 'completed', 'archived'])
      .withMessage('Invalid status'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 5000 })
      .withMessage('Limit must be between 1 and 5000'),
  ],
  logActivity('get_meeting_records'),
  getMeetingRecords
);

// @desc    Create new meeting record
// @route   POST /api/meeting-records
// @access  Private
router.post(
  '/',
  createLimiter,
  validateMeetingRecord,
  logActivity('create_meeting_record'),
  createMeetingRecord
);

// @desc    Get single meeting record
// @route   GET /api/meeting-records/:id
// @access  Private
router.get(
  '/:id',
  generalLimiter,
  [param('id').isMongoId().withMessage('Valid meeting record ID is required')],
  logActivity('get_meeting_record'),
  getMeetingRecord
);

// @desc    Update meeting record
// @route   PUT /api/meeting-records/:id
// @access  Private
router.put(
  '/:id',
  generalLimiter,
  [param('id').isMongoId().withMessage('Valid meeting record ID is required')],
  validateMeetingRecord,
  logActivity('update_meeting_record'),
  updateMeetingRecord
);

// @desc    Delete meeting record
// @route   DELETE /api/meeting-records/:id
// @access  Private
router.delete(
  '/:id',
  generalLimiter,
  [param('id').isMongoId().withMessage('Valid meeting record ID is required')],
  logActivity('delete_meeting_record'),
  deleteMeetingRecord
);

module.exports = router;
