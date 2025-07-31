const { body } = require('express-validator');

// Validation rules for user registration (UPDATED)
const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s\u4e00-\u9fff]+$/)
    .withMessage('Name can only contain letters, spaces, and Chinese characters'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
    .isLength({ max: 100 })
    .withMessage('Email cannot exceed 100 characters'),

  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[+]?[0-9\s\-()]+$/)
    .withMessage('Please provide a valid phone number')
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),

  body('inviteCode')
    .notEmpty()
    .withMessage('Invite code is required')
    .isLength({ min: 10, max: 10 })
    .withMessage('Invite code must be exactly 10 characters')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Invite code can only contain letters and numbers'),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  body('teacherId')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Teacher ID must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9-_]+$/)
    .withMessage('Teacher ID can only contain letters, numbers, hyphens, and underscores'),

  body('preferredDistrict')
    .optional()
    .isIn([
      'Central and Western',
      'Eastern',
      'Southern',
      'Wan Chai',
      'Kowloon City',
      'Kwun Tong',
      'Sham Shui Po',
      'Wong Tai Sin',
      'Yau Tsim Mong',
      'Islands',
      'Kwai Tsing',
      'North',
      'Sai Kung',
      'Sha Tin',
      'Tai Po',
      'Tsuen Wan',
      'Tuen Mun',
      'Yuen Long',
    ])
    .withMessage('Please select a valid Hong Kong district'),

  body('experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be a number between 0 and 50'),

  body('subjects')
    .optional()
    .isArray()
    .withMessage('Subjects must be an array')
    .custom(subjects => {
      if (subjects && subjects.length > 0) {
        for (const subject of subjects) {
          if (typeof subject !== 'string' || subject.trim().length === 0) {
            throw new Error('Each subject must be a non-empty string');
          }
          if (subject.length > 50) {
            throw new Error('Each subject name cannot exceed 50 characters');
          }
        }
      }
      return true;
    }),
];

// Validation rules for user login
const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),

  body('password').notEmpty().withMessage('Password is required'),
];

// Validation rules for updating user details
const validateUpdateDetails = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s\u4e00-\u9fff]+$/)
    .withMessage('Name can only contain letters, spaces, and Chinese characters'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
    .isLength({ max: 100 })
    .withMessage('Email cannot exceed 100 characters'),

  body('phone')
    .optional()
    .matches(/^[+]?[0-9\s\-()]+$/)
    .withMessage('Please provide a valid phone number')
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),

  body('teacherId')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Teacher ID must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9-_]+$/)
    .withMessage('Teacher ID can only contain letters, numbers, hyphens, and underscores'),

  body('preferredDistrict')
    .optional()
    .isIn([
      'Central and Western',
      'Eastern',
      'Southern',
      'Wan Chai',
      'Kowloon City',
      'Kwun Tong',
      'Sham Shui Po',
      'Wong Tai Sin',
      'Yau Tsim Mong',
      'Islands',
      'Kwai Tsing',
      'North',
      'Sai Kung',
      'Sha Tin',
      'Tai Po',
      'Tsuen Wan',
      'Tuen Mun',
      'Yuen Long',
    ])
    .withMessage('Please select a valid Hong Kong district'),

  body('experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be a number between 0 and 50'),

  body('subjects')
    .optional()
    .isArray()
    .withMessage('Subjects must be an array')
    .custom(subjects => {
      if (subjects && subjects.length > 0) {
        for (const subject of subjects) {
          if (typeof subject !== 'string' || subject.trim().length === 0) {
            throw new Error('Each subject must be a non-empty string');
          }
          if (subject.length > 50) {
            throw new Error('Each subject name cannot exceed 50 characters');
          }
        }
      }
      return true;
    }),
];

// Validation rules for updating password
const validateUpdatePassword = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match new password');
    }
    return true;
  }),
];

// Validation rules for forgot password
const validateForgotPassword = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
];

// Validation rules for reset password
const validateResetPassword = [
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  }),
];

const validateInviteCode = [
  body('inviteCode')
    .notEmpty()
    .withMessage('Invite code is required')
    .isLength({ min: 10, max: 10 })
    .withMessage('Invite code must be exactly 10 characters')
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('Invite code can only contain letters and numbers'),
];

// UPDATED: Validation rules for NEW school schema
const validateSchool = [
  // 基本資料 - Basic Information

  // 1. 學校名稱 - REQUIRED ✅
  body('name')
    .trim()
    .notEmpty()
    .withMessage('School name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('School name must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9\u4e00-\u9fff\s\-().]+$/)
    .withMessage('School name contains invalid characters'),

  // 2. 英文名稱 - OPTIONAL ✅
  body('nameEn')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('English name cannot exceed 100 characters')
    .matches(/^[a-zA-Z0-9\s\-().]*$/)
    .withMessage(
      'English name can only contain letters, numbers, spaces, hyphens, parentheses, and periods'
    ),

  // 3. 學校類型 - REQUIRED ✅
  body('schoolType')
    .notEmpty()
    .withMessage('School type is required')
    .isIn(['primary', 'secondary', 'both'])
    .withMessage('School type must be primary, secondary, or both'),

  // 4. 地區 - OPTIONAL ✅
  body('district')
    .optional({ nullable: true, checkFalsy: true })
    .isIn([
      'Central and Western',
      'Eastern',
      'Southern',
      'Wan Chai',
      'Kowloon City',
      'Kwun Tong',
      'Sham Shui Po',
      'Wong Tai Sin',
      'Yau Tsim Mong',
      'Islands',
      'Kwai Tsing',
      'North',
      'Sai Kung',
      'Sha Tin',
      'Tai Po',
      'Tsuen Wan',
      'Tuen Mun',
      'Yuen Long',
    ])
    .withMessage('Please select a valid Hong Kong district'),

  // 位置資訊 - Location Information

  // 1. 學校地址 - OPTIONAL ✅
  body('address')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),

  // 聯絡資訊 - Contact Information

  // 1. 聯絡人 - OPTIONAL ✅
  body('contactPerson')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Contact person name cannot exceed 50 characters')
    .matches(/^[a-zA-Z\u4e00-\u9fff\s\-.]*$/)
    .withMessage('Contact person name contains invalid characters'),

  // 3. 電郵地址 - OPTIONAL ✅
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 100 })
    .withMessage('Email cannot exceed 100 characters'),

  // 4. 電話號碼 - OPTIONAL ✅
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[0-9\s\-( )]+$/)
    .withMessage(
      'Phone number can only contain numbers, spaces, hyphens, plus signs, and parentheses'
    )
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),

  // 其他資訊 - Other Information

  // 1. 學校簡介 - OPTIONAL ✅
  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('School description cannot exceed 1000 characters'),
];

// Update school validation (stricter - only allow certain fields to be updated)
const validateUpdateSchool = [
  // Allow updating school name
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('School name must be between 3 and 100 characters'),

  // All other fields are optional for updates
  body('nameEn')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('English name cannot exceed 100 characters'),

  body('district')
    .optional({ nullable: true, checkFalsy: true })
    .isIn([
      'Central and Western',
      'Eastern',
      'Southern',
      'Wan Chai',
      'Kowloon City',
      'Kwun Tong',
      'Sham Shui Po',
      'Wong Tai Sin',
      'Yau Tsim Mong',
      'Islands',
      'Kwai Tsing',
      'North',
      'Sai Kung',
      'Sha Tin',
      'Tai Po',
      'Tsuen Wan',
      'Tuen Mun',
      'Yuen Long',
    ])
    .withMessage('Please select a valid Hong Kong district'),

  body('address')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),

  body('contactPerson')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Contact person name cannot exceed 50 characters'),

  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Please provide a valid email address'),

  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[0-9\s\-( )]+$/)
    .withMessage(
      'Phone number can only contain numbers, spaces, hyphens, plus signs, and parentheses'
    ),

  body('description')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('School description cannot exceed 1000 characters'),

  // Prevent modification of critical fields
  body('schoolType')
    .custom(() => {
      throw new Error('School type cannot be modified after creation');
    })
    .optional(),

  body('createdBy')
    .custom(() => {
      throw new Error('Created by field cannot be modified');
    })
    .optional(),

  body('teachers')
    .custom(() => {
      throw new Error('Use the dedicated teacher management endpoints');
    })
    .optional(),

  body('subjects')
    .custom(() => {
      throw new Error('Use the dedicated subject management endpoints');
    })
    .optional(),
];

const validateSchoolChange = [
  body('newSchoolId')
    .isMongoId()
    .withMessage('Valid new school ID is required'),
  
  body('studentId')
    .isMongoId()
    .withMessage('Valid student ID is required'),
    
  body('confirmTransfer')
    .isBoolean()
    .withMessage('Transfer confirmation is required')
    .custom((value) => {
      if (!value) {
        throw new Error('School transfer must be confirmed');
      }
      return true;
    }),
];
// Validation rules for student creation
const validateStudent = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Student name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s\u4e00-\u9fff]+$/)
    .withMessage('Student name can only contain letters, spaces, and Chinese characters'),

  body('nameEn')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('English name cannot exceed 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('English name can only contain letters and spaces'),

  body('nameCh')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Chinese name cannot exceed 50 characters')
    .matches(/^[\u4e00-\u9fff\s]+$/)
    .withMessage('Chinese name can only contain Chinese characters and spaces'),

  body('studentId')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Student ID must be between 1 and 20 characters')
    .matches(/^[a-zA-Z0-9-_]+$/)
    .withMessage('Student ID can only contain letters, numbers, hyphens, and underscores'),

  body('school').isMongoId().withMessage('Valid school ID is required'),

  body('academicYear')
    .matches(/^\d{4}\/\d{2}$/)
    .withMessage('Academic year must be in format YYYY/YY (e.g., 2025/26)'),

  body('grade')
    .isIn(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'])
    .withMessage('Invalid grade'),

  body('class')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Class cannot exceed 10 characters'),

  body('classNumber')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Class number must be between 1 and 50'),

  body('dateOfBirth')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Date of birth must be a valid date'),

  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
];

// Validation rules for student reports
const validateStudentReport = [
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

  body('remarks.teacher_comments')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Teacher comments cannot exceed 1000 characters'),

  body('tags').optional().isArray().withMessage('Tags must be an array'),

  body('isPrivate').optional().isBoolean().withMessage('isPrivate must be a boolean'),

  body('status')
    .optional()
    .isIn(['draft', 'submitted', 'reviewed', 'approved', 'archived'])
    .withMessage('Status must be draft, submitted, reviewed, approved, or archived'),
];

// Sanitization middleware to clean input data
const sanitizeInput = (req, res, next) => {
  // Remove any potential HTML/script tags from string inputs
  const sanitizeString = str => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  };

  // Recursively sanitize object
  const sanitizeObject = obj => {
    if (obj === null || typeof obj !== 'object') {
      return typeof obj === 'string' ? sanitizeString(obj) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  };

  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);

  next();
};

const exports_ = {
  validateRegister,
  validateLogin,
  validateUpdateDetails,
  validateUpdatePassword,
  validateForgotPassword,
  validateResetPassword,
  validateInviteCode,
  validateSchoolChange,
  validateSchool,
  validateUpdateSchool,
  validateStudent,
  validateStudentReport,
  sanitizeInput,
};

module.exports = exports_;
