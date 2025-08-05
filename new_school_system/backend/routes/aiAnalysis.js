// File: routes/aiAnalysis.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');

const {
  upload,
  extractStudentData,
  importStudentData,
  getAIAnalysisStats,
  checkAIServiceStatus,
} = require('../controllers/aiAnalysisController');

const { protect, authorize, logActivity, checkUserRateLimit } = require('../middleware/auth');

const { sanitizeInput } = require('../middleware/validation');

// Rate limiting for AI operations
const aiAnalysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit AI analysis to 5 requests per 15 minutes
  message: {
    success: false,
    message: 'AI 分析請求過於頻繁，請稍後再試',
  },
});

const importLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 10 minutes
  max: 3000, // Limit imports to 3000 per 10 minutes
  message: {
    success: false,
    message: '資料匯入請求過於頻繁，請稍後再試',
  },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: {
    success: false,
    message: '請求過於頻繁，請稍後再試',
  },
});

// Apply middleware to all routes
router.use(protect); // All routes require authentication
router.use(sanitizeInput);
router.use(checkUserRateLimit);

// Validation rules for student data import
const validateImportData = [
  body('schoolId').isMongoId().withMessage('請提供有效的學校ID'),

  body('academicYear')
    .matches(/^\d{4}\/\d{2}$/)
    .withMessage('學年格式必須為 YYYY/YY (例如: 2025/26)'),

  body('studentsData')
    .isArray()
    .withMessage('學生資料必須是陣列格式')
    .custom(studentsData => {
      if (studentsData.length === 0) {
        throw new Error('學生資料不能為空');
      }
      if (studentsData.length > 1000) {
        throw new Error('一次最多只能匯入 1000 名學生');
      }
      return true;
    }),

  // Optional fields - only validate if they exist and are not null/empty
  body('studentsData.*.name')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 1, max: 50 })
    .withMessage('學生姓名長度必須在 1-50 字符之間'),

  body('studentsData.*.nameEn')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 1, max: 50 })
    .withMessage('英文姓名長度必須在 1-50 字符之間'),

  body('studentsData.*.nameCh')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ min: 1, max: 50 })
    .withMessage('中文姓名長度必須在 1-50 字符之間'),

  body('studentsData.*.studentId')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 20 })
    .withMessage('學號不能超過 20 字符'),

  body('studentsData.*.grade')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'])
    .withMessage('年級必須是有效的香港學制年級'),

  body('studentsData.*.email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .withMessage('請提供有效的電子郵件地址'),

  body('studentsData.*.phone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^[+]?[0-9\s\-()]+$/)
    .withMessage('請提供有效的電話號碼'),

  body('studentsData.*.gender')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['male', 'female', 'other'])
    .withMessage('性別必須是 male、female 或 other'),

  body('studentsData.*.class')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 10 })
    .withMessage('班別不能超過 10 字符'),

  body('studentsData.*.address')
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 200 })
    .withMessage('地址不能超過 200 字符'),
];

// Routes

// @desc    Check AI service status
// @route   GET /api/ai-analysis/status
// @access  Private
router.get('/status', generalLimiter, logActivity('check_ai_service_status'), checkAIServiceStatus);

// @desc    Get AI analysis statistics
// @route   GET /api/ai-analysis/stats
// @access  Private
router.get('/stats', generalLimiter, logActivity('get_ai_analysis_stats'), getAIAnalysisStats);

// @desc    Extract student data from file using AI
// @route   POST /api/ai-analysis/extract
// @access  Private
router.post(
  '/extract',
  aiAnalysisLimiter,
  upload.single('file'),
  body('schoolId').isMongoId().withMessage('請提供有效的學校ID'),
  body('academicYear')
    .optional()
    .matches(/^\d{4}\/\d{2}$/)
    .withMessage('學年格式必須為 YYYY/YY'),
  logActivity('ai_extract_data'),
  extractStudentData
);

// @desc    Import student data to database
// @route   POST /api/ai-analysis/import
// @access  Private
router.post(
  '/import',
  importLimiter,
  validateImportData,
  logActivity('ai_import_data'),
  importStudentData
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '檔案大小超過限制（最大 25MB）',
      });
    }
    return res.status(400).json({
      success: false,
      message: `檔案上傳錯誤: ${error.message}`,
    });
  }

  if (error.message === '不支援的檔案格式') {
    return res.status(400).json({
      success: false,
      message: '不支援的檔案格式。請上傳 Excel、CSV、PDF 或 Word 檔案',
    });
  }

  next(error);
});

module.exports = router;
