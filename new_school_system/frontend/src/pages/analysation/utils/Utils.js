// src/pages/analysation/utils/Utils.js - Utility Functions
/**
 * Normalize string by removing extra spaces, converting to lowercase, and trimming
 */
export const normalizeString = input => {
  if (typeof input !== 'string') {
    return String(input || '').trim();
  }

  return input
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .toLowerCase();
};

/**
 * Validate email format
 */
export const isValidEmail = email => {
  if (!email || typeof email !== 'string') return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format (Hong Kong style)
 */
export const isValidPhone = phone => {
  if (!phone || typeof phone !== 'string') return false;

  // Accept Hong Kong phone formats: +852 XXXX XXXX, XXXX XXXX, etc.
  const phoneRegex = /^(\+852\s?)?[2-9]\d{7}$|^[2-9]\d{3}\s?\d{4}$/;
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  return phoneRegex.test(cleanPhone) && cleanPhone.length >= 8;
};

/**
 * Clean and validate string input
 */
export const sanitizeInput = (input, maxLength = 100) => {
  if (typeof input !== 'string') return '';

  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .slice(0, maxLength);
};

/**
 * Parse Hong Kong school type from text
 */
export const parseSchoolType = text => {
  if (!text || typeof text !== 'string') return null;

  const normalized = normalizeString(text);

  if (normalized.includes('小學') || normalized.includes('primary')) {
    return 'primary';
  } else if (normalized.includes('中學') || normalized.includes('secondary')) {
    return 'secondary';
  } else if (normalized.includes('特殊') || normalized.includes('special')) {
    return 'special';
  }

  return null;
};

/**
 * Extract numeric value from string
 */
export const extractNumber = str => {
  if (typeof str === 'number') return str;
  if (typeof str !== 'string') return null;

  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

/**
 * Fuzzy match header against synonyms
 */
export const fuzzyMatchHeader = (header, headerSynonyms) => {
  if (!header || typeof header !== 'string') return null;

  const normalizedHeader = normalizeString(header);
  let bestMatch = null;
  let bestScore = 0;

  for (const [standardField, synonyms] of Object.entries(headerSynonyms)) {
    for (const synonym of synonyms) {
      const similarity = calculateStringSimilarity(normalizedHeader, normalizeString(synonym));

      if (similarity > bestScore && similarity > 0.7) {
        // 70% similarity threshold
        bestScore = similarity;
        bestMatch = standardField;
      }
    }
  }

  if (bestMatch && bestScore > 0.7) {
    console.log(
      `[Utils] 🔍 模糊匹配: "${header}" → "${bestMatch}" (相似度: ${Math.round(bestScore * 100)}%)`
    );
  }

  return bestMatch;
};

/**
 * Calculate string similarity using Levenshtein distance
 */
export const calculateStringSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  // Create matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  const maxLength = Math.max(len1, len2);
  const similarity = (maxLength - matrix[len1][len2]) / maxLength;

  return Math.max(0, similarity);
};

/**
 * Validate Hong Kong grade format
 */
export const isValidHKGrade = grade => {
  if (!grade || typeof grade !== 'string') return false;

  const validGrades = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
  return validGrades.includes(grade.toUpperCase());
};

/**
 * Format file size for display
 */
export const formatFileSize = bytes => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Debounce function to limit rate of function calls
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Generate unique ID
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Safe JSON parse with error handling
 */
export const safeJsonParse = (str, defaultValue = null) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.warn('[Utils] JSON 解析失敗:', error);
    return defaultValue;
  }
};

/**
 * Deep clone object
 */
export const deepClone = obj => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

/**
 * Check if object is empty
 */
export const isEmpty = obj => {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

/**
 * Capitalize first letter of string
 */
export const capitalize = str => {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Format date to readable string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '';

  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options,
  };

  try {
    return new Date(date).toLocaleDateString('zh-HK', defaultOptions);
  } catch (error) {
    console.warn('[Utils] 日期格式化失敗:', error);
    return String(date);
  }
};

/**
 * Remove duplicates from array based on key
 */
export const removeDuplicates = (array, key) => {
  if (!Array.isArray(array)) return [];

  const seen = new Set();
  return array.filter(item => {
    const value = key ? item[key] : item;
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

/**
 * Group array items by key
 */
export const groupBy = (array, key) => {
  if (!Array.isArray(array)) return {};

  return array.reduce((groups, item) => {
    const value = typeof key === 'function' ? key(item) : item[key];
    const group = groups[value] || [];
    group.push(item);
    groups[value] = group;
    return groups;
  }, {});
};

/**
 * Sort array by multiple keys
 */
export const sortBy = (array, ...keys) => {
  if (!Array.isArray(array)) return [];

  return array.sort((a, b) => {
    for (const key of keys) {
      const aVal = typeof key === 'function' ? key(a) : a[key];
      const bVal = typeof key === 'function' ? key(b) : b[key];

      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }
    return 0;
  });
};

/**
 * Validate required fields in object
 */
export const validateRequired = (obj, requiredFields) => {
  const missing = [];

  for (const field of requiredFields) {
    if (!obj[field] || (typeof obj[field] === 'string' && obj[field].trim() === '')) {
      missing.push(field);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
  };
};

/**
 * Create error object with consistent format
 */
export const createError = (message, code = 'UNKNOWN_ERROR', details = {}) => {
  return {
    success: false,
    error: {
      message,
      code,
      details,
      timestamp: new Date().toISOString(),
    },
  };
};

/**
 * Create success object with consistent format
 */
export const createSuccess = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Retry function with exponential backoff
 */
export const retry = async (fn, maxAttempts = 3, baseDelay = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`[Utils] 重試第 ${attempt} 次，${delay}ms 後再試...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Throttle function to limit rate of execution
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Convert Chinese numbers to Arabic numbers
 */
export const chineseToNumber = str => {
  if (!str || typeof str !== 'string') return null;

  const chineseNumbers = {
    一: '1',
    二: '2',
    三: '3',
    四: '4',
    五: '5',
    六: '6',
    七: '7',
    八: '8',
    九: '9',
    十: '10',
  };

  // Replace Chinese numbers with Arabic numbers
  let result = str;
  for (const [chinese, arabic] of Object.entries(chineseNumbers)) {
    result = result.replace(new RegExp(chinese, 'g'), arabic);
  }

  return result;
};

/**
 * Escape HTML to prevent XSS
 */
export const escapeHtml = str => {
  if (!str || typeof str !== 'string') return '';

  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };

  return str.replace(/[&<>"']/g, match => htmlEscapes[match]);
};

/**
 * Check if string contains only safe characters
 */
export const isSafeString = str => {
  if (!str || typeof str !== 'string') return true;

  // Allow letters, numbers, spaces, and common punctuation
  const safePattern = /^[a-zA-Z0-9\u4e00-\u9fff\s\-_.,()[\]@#]+$/;
  return safePattern.test(str);
};

/**
 * Generate random string of specified length
 */
export const randomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Convert object to query string
 */
export const objectToQueryString = obj => {
  if (!obj || typeof obj !== 'object') return '';

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      params.append(key, String(value));
    }
  }
  return params.toString();
};

/**
 * Parse query string to object
 */
export const queryStringToObject = queryString => {
  if (!queryString || typeof queryString !== 'string') return {};

  const params = new URLSearchParams(queryString);
  const result = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
};
