// File: src/utils/constants.js

// District Chinese names mapping for display
export const HK_DISTRICTS_CHINESE = {
  'Central and Western': '中西區',
  Eastern: '東區',
  Southern: '南區',
  'Wan Chai': '灣仔區',
  'Kowloon City': '九龍城區',
  'Kwun Tong': '觀塘區',
  'Sham Shui Po': '深水埗區',
  'Wong Tai Sin': '黃大仙區',
  'Yau Tsim Mong': '油尖旺區',
  Islands: '離島區',
  'Kwai Tsing': '葵青區',
  North: '北區',
  'Sai Kung': '西貢區',
  'Sha Tin': '沙田區',
  'Tai Po': '大埔區',
  'Tsuen Wan': '荃灣區',
  'Tuen Mun': '屯門區',
  'Yuen Long': '元朗區',
};

export const HK_DISTRICTS = Object.entries(HK_DISTRICTS_CHINESE).map(([labelEn, label]) => ({
  value: labelEn,
  label,
  labelEn,
  grades: [], // Placeholder, or add actual grades if needed per district
}));

export const HK_GRADES = {
  PRIMARY: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
  SECONDARY: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  ALL: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
};

// Grade Chinese names mapping for display
export const HK_GRADES_CHINESE = {
  P1: '小一',
  P2: '小二',
  P3: '小三',
  P4: '小四',
  P5: '小五',
  P6: '小六',
  S1: '中一',
  S2: '中二',
  S3: '中三',
  S4: '中四',
  S5: '中五',
  S6: '中六',
};

export const SCHOOL_TYPES = [
  { value: 'primary', label: '小學', labelEn: 'Primary School', grades: HK_GRADES.PRIMARY },
  { value: 'secondary', label: '中學', labelEn: 'Secondary School', grades: HK_GRADES.SECONDARY },
  { value: 'both', label: '特殊', labelEn: 'Primary & Secondary', grades: HK_GRADES.ALL },
];

export const USER_ROLES = [
  { value: 'teacher', label: '教師', labelEn: 'Teacher' },
  { value: 'admin', label: '管理員', labelEn: 'Administrator' },
];

export const STUDENT_STATUS = [
  { value: 'enrolled', label: '已註冊', labelEn: 'Enrolled', color: '#27ae60' },
  { value: 'transferred', label: '已轉校', labelEn: 'Transferred', color: '#3498db' },
  { value: 'graduated', label: '已畢業', labelEn: 'Graduated', color: '#27ae60' },
  { value: 'dropped_out', label: '已退學', labelEn: 'Dropped Out', color: '#e74c3c' },
  { value: 'suspended', label: '已停學', labelEn: 'Suspended', color: '#e74c3c' },
];

export const GENDER_OPTIONS = [
  { value: 'male', label: '男', labelEn: 'Male' },
  { value: 'female', label: '女', labelEn: 'Female' },
  { value: 'other', label: '其他', labelEn: 'Other' },
];

// Form validation constants with Chinese error messages
export const VALIDATION_RULES = {
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z\s\u4e00-\u9fff]+$/,
  },
  EMAIL: {
    PATTERN: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  },
  PHONE: {
    PATTERN: /^[+]?[0-9\s\-()]+$/,
  },
  STUDENT_ID: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 20,
    PATTERN: /^[a-zA-Z0-9\-_]+$/,
  },
};

export const VALIDATION_MESSAGES = {
  REQUIRED: '此欄位為必填',
  NAME_INVALID: '姓名只能包含中文、英文字母和空格',
  EMAIL_INVALID: '請輸入有效的電子郵件地址',
  PASSWORD_TOO_SHORT: '密碼至少需要8個字符',
  PASSWORD_WEAK: '密碼必須包含大小寫字母、數字和特殊字符',
  PHONE_INVALID: '請輸入有效的電話號碼',
  STUDENT_ID_INVALID: '學號只能包含字母、數字、連字號和下劃線',
};

export const SUCCESS_MESSAGES = {
  SCHOOL_CREATED: '學校已成功建立',
  STUDENT_CREATED: '學生已成功註冊',
  RECORD_CREATED: '記錄已成功建立',
  DATA_UPDATED: '資料已成功更新',
  DATA_DELETED: '資料已成功刪除',
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: '網絡連接錯誤，請檢查您的網絡連接',
  SERVER_ERROR: '伺服器錯誤，請稍後再試',
  UNAUTHORIZED: '您沒有權限執行此操作',
  NOT_FOUND: '找不到請求的資源',
  VALIDATION_ERROR: '資料驗證失敗，請檢查輸入內容',
  GENERIC_ERROR: '發生未知錯誤，請稍後再試',
};

export const LOADING_MESSAGES = {
  LOADING_SCHOOLS: '載入學校資料中...',
  LOADING_STUDENTS: '載入學生資料中...',
  LOADING_DASHBOARD: '載入控制台中...',
  SAVING_DATA: '儲存資料中...',
  DELETING_DATA: '刪除資料中...',
};

// API endpoints constants (keep in English for backend compatibility)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
    REFRESH: '/api/auth/refresh',
  },
  SCHOOLS: {
    BASE: '/api/schools',
    STATS: id => `/api/schools/${id}/stats`,
  },
  STUDENTS: {
    BASE: '/api/students',
    MY_STUDENTS: '/api/students/my-students',
  },
};

// Utility functions
export const getCurrentAcademicYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear(); // 2025
  const currentMonth = now.getMonth() + 1; // July = 7

  if (currentMonth >= 7) {
    // July or later = next academic year
    const nextYear = (currentYear + 1).toString().slice(-2);
    return `${currentYear}/${nextYear}`;
  } else {
    const prevYear = currentYear - 1;
    const currentYearShort = currentYear.toString().slice(-2);
    return `${prevYear}/${currentYearShort}`;
  }
};

export const getGradesBySchoolType = schoolType => {
  const type = SCHOOL_TYPES.find(t => t.value === schoolType);
  return type ? type.grades : [];
};

export const isGradeValidForSchoolType = (grade, schoolType) => {
  const validGrades = getGradesBySchoolType(schoolType);
  return validGrades.includes(grade);
};

// Helper function to get Chinese district name
export const getDistrictChinese = englishDistrict => {
  return HK_DISTRICTS_CHINESE[englishDistrict] || englishDistrict;
};

// Helper function to get Chinese grade name
export const getGradeChinese = gradeCode => {
  return HK_GRADES_CHINESE[gradeCode] || gradeCode;
};

// Helper function to get Chinese school type
export const getSchoolTypeChinese = schoolType => {
  const type = SCHOOL_TYPES.find(t => t.value === schoolType);
  return type ? type.label : schoolType;
};

// Helper function to get Chinese gender
export const getGenderChinese = gender => {
  const genderOption = GENDER_OPTIONS.find(g => g.value === gender);
  return genderOption ? genderOption.label : gender;
};

// Helper function to get Chinese student status
export const getStudentStatusChinese = status => {
  const statusOption = STUDENT_STATUS.find(s => s.value === status);
  return statusOption ? statusOption.label : status;
};

// Helper function to get Chinese user role
export const getUserRoleChinese = role => {
  const roleOption = USER_ROLES.find(r => r.value === role);
  return roleOption ? roleOption.label : role;
};

export default {
  HK_DISTRICTS,
  HK_DISTRICTS_CHINESE,
  HK_GRADES,
  HK_GRADES_CHINESE,
  SCHOOL_TYPES,
  USER_ROLES,
  STUDENT_STATUS,
  GENDER_OPTIONS,
  VALIDATION_RULES,
  VALIDATION_MESSAGES,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
  LOADING_MESSAGES,
  API_ENDPOINTS,
  getCurrentAcademicYear,
  getGradesBySchoolType,
  isGradeValidForSchoolType,
  getDistrictChinese,
  getGradeChinese,
  getSchoolTypeChinese,
  getGenderChinese,
  getStudentStatusChinese,
  getUserRoleChinese,
};
