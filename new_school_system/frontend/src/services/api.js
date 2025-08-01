import axios from 'axios';

let globalRateLimitHandler = null;

export const setGlobalRateLimitHandler = handler => {
  globalRateLimitHandler = handler;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const tokenManager = {
  getAccessToken: () => {
    const localToken = localStorage.getItem('accessToken');
    if (localToken) return localToken;

    const cookieToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('accessToken='))
      ?.split('=')[1];
    return cookieToken || null;
  },
  setAccessToken: token =>
    token ? localStorage.setItem('accessToken', token) : localStorage.removeItem('accessToken'),
  getRefreshToken: () => {
    const localToken = localStorage.getItem('refreshToken');
    if (localToken) return localToken;

    const cookieToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('refreshToken='))
      ?.split('=')[1];
    return cookieToken || null;
  },
  setRefreshToken: token =>
    token ? localStorage.setItem('refreshToken', token) : localStorage.removeItem('refreshToken'),
  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  },
  getUser: () => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  },
  setUser: user =>
    user ? localStorage.setItem('user', JSON.stringify(user)) : localStorage.removeItem('user'),
};

api.interceptors.request.use(
  config => {
    const token = tokenManager.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

api.interceptors.response.use(
  response => {
    return response;
  },

  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 429) {
      const retryAfter = error.response.data?.retryAfter || 900;

      if (globalRateLimitHandler) {
        globalRateLimitHandler({
          retryAfter: retryAfter,
          originalError: error.response.data,
          status: 429,
        });
        return Promise.reject({ status: 429, handled: true });
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = tokenManager.getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token available');
        const refreshResponse = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auth/refresh`,
          { refreshToken },
          { withCredentials: true, timeout: 10000 }
        );
        const { token: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data.data;
        tokenManager.setAccessToken(newAccessToken);
        if (newRefreshToken) tokenManager.setRefreshToken(newRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        tokenManager.clearTokens();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    const errorData = {
      message: error.response?.data?.message || error.message || 'An unexpected error occurred',
      status: error.response?.status,
      data: error.response?.data,
      isNetworkError: !error.response,
      retryAfter: error.response?.data?.retryAfter,
    };

    if (error.code === 'ECONNABORTED') errorData.isTimeout = true;
    if (error.code === 'ERR_NETWORK') errorData.isNetworkError = true;

    return Promise.reject(errorData);
  }
);

const unwrap = res => {
  if (res?.data?.data !== undefined) {
    if (res.data.data.reports !== undefined) {
      return res.data.data.reports;
    }
    if (res.data.data.students !== undefined) {
      return res.data.data.students;
    }
    if (res.data.data.student !== undefined) {
      return res.data.data.student;
    }
    return res.data.data;
  }
  return res?.data;
};

export const apiRequest = {
  get: async (url, config = {}) => unwrap(await api.get(url, config)),
  post: async (url, data = {}, config = {}) => unwrap(await api.post(url, data, config)),
  put: async (url, data = {}, config = {}) => unwrap(await api.put(url, data, config)),
  patch: async (url, data = {}, config = {}) => unwrap(await api.patch(url, data, config)),
  delete: async (url, config = {}) => unwrap(await api.delete(url, config)),
};

// School management helpers
export const schoolHelpers = {
  getAll: async (params = {}) => {
    try {
      return await apiRequest.get('/api/schools', { params });
    } catch (error) {
      console.error('Failed to fetch schools:', error);
      throw error;
    }
  },

  getById: async id => {
    try {
      return await apiRequest.get(`/api/schools/${id}`);
    } catch (error) {
      console.error(`Failed to fetch school ${id}:`, error);
      throw error;
    }
  },

  create: async schoolData => {
    try {
      return await apiRequest.post('/api/schools', schoolData);
    } catch (error) {
      console.error('Failed to create school:', error);
      throw error;
    }
  },

  update: async (id, schoolData) => {
    try {
      return await apiRequest.put(`/api/schools/${id}`, schoolData);
    } catch (error) {
      console.error(`Failed to update school ${id}:`, error);
      throw error;
    }
  },

  delete: async id => {
    try {
      return await apiRequest.delete(`/api/schools/${id}`);
    } catch (error) {
      console.error(`Failed to delete school ${id}:`, error);
      throw error;
    }
  },

  getStats: async id => {
    try {
      return await apiRequest.get(`/api/schools/${id}/stats`);
    } catch (error) {
      console.error(`Failed to fetch school stats for ${id}:`, error);
      throw error;
    }
  },
};

// Student management helpers
export const studentHelpers = {
  getAll: async (params = {}) => {
    try {
      return await apiRequest.get('/api/students', { params });
    } catch (error) {
      console.error('Failed to fetch students:', error);
      throw error;
    }
  },

  getById: async id => {
    try {
      return await apiRequest.get(`/api/students/${id}`);
    } catch (error) {
      console.error(`Failed to fetch student ${id}:`, error);
      throw error;
    }
  },

  create: async studentData => {
    try {
      return await apiRequest.post('/api/students', studentData);
    } catch (error) {
      console.error('Failed to create student:', error);
      throw error;
    }
  },

  update: async (id, studentData) => {
    try {
      return await apiRequest.put(`/api/students/${id}`, studentData);
    } catch (error) {
      console.error(`Failed to update student ${id}:`, error);
      throw error;
    }
  },

  delete: async id => {
    try {
      return await apiRequest.delete(`/api/students/${id}`);
    } catch (error) {
      console.error(`Failed to delete student ${id}:`, error);
      throw error;
    }
  },

  getMyStudents: async (params = {}) => {
    try {
      return await apiRequest.get('/api/students/my-students', { params });
    } catch (error) {
      console.error('Failed to fetch my students:', error);
      throw error;
    }
  },

  getStats: async schoolId => {
    try {
      return await apiRequest.get(`/api/students/stats/${schoolId}`);
    } catch (error) {
      console.error(`Failed to fetch student stats for school ${schoolId}:`, error);
      throw error;
    }
  },
};

// ✨ NEW: Student Reports API helpers
export const studentReportHelpers = {
  // Get all student reports
  getAll: async (params = {}) => {
    try {
      return await apiRequest.get('/api/student-reports', { params });
    } catch (error) {
      console.error('Failed to fetch student reports:', error);
      throw error;
    }
  },

  // Get single student report
  getById: async id => {
    try {
      return await apiRequest.get(`/api/student-reports/${id}`);
    } catch (error) {
      console.error(`Failed to fetch student report ${id}:`, error);
      throw error;
    }
  },

  // Create new student report
  create: async reportData => {
    try {
      return await apiRequest.post('/api/student-reports', reportData);
    } catch (error) {
      console.error('Failed to create student report:', error);
      throw error;
    }
  },

  // Update student report
  update: async (id, reportData) => {
    try {
      return await apiRequest.put(`/api/student-reports/${id}`, reportData);
    } catch (error) {
      console.error(`Failed to update student report ${id}:`, error);
      throw error;
    }
  },

  // Delete student report
  delete: async id => {
    try {
      return await apiRequest.delete(`/api/student-reports/${id}`);
    } catch (error) {
      console.error(`Failed to delete student report ${id}:`, error);
      throw error;
    }
  },

  // Get reports by student
  getByStudent: async (studentId, params = {}) => {
    try {
      return await apiRequest.get(`/api/student-reports/student/${studentId}`, { params });
    } catch (error) {
      console.error(`Failed to fetch reports for student ${studentId}:`, error);
      throw error;
    }
  },

  // Get my reports (for teachers)
  getMyReports: async (params = {}) => {
    try {
      return await apiRequest.get('/api/student-reports/my-reports', { params });
    } catch (error) {
      console.error('Failed to fetch my reports:', error);
      throw error;
    }
  },

  // Get report statistics
  getStats: async (params = {}) => {
    try {
      return await apiRequest.get('/api/student-reports/stats', { params });
    } catch (error) {
      console.error('Failed to fetch report statistics:', error);
      throw error;
    }
  },

  // Report status management
  submit: async id => {
    try {
      return await apiRequest.put(`/api/student-reports/${id}/submit`);
    } catch (error) {
      console.error(`Failed to submit report ${id}:`, error);
      throw error;
    }
  },

  review: async id => {
    try {
      return await apiRequest.put(`/api/student-reports/${id}/review`);
    } catch (error) {
      console.error(`Failed to review report ${id}:`, error);
      throw error;
    }
  },

  approve: async id => {
    try {
      return await apiRequest.put(`/api/student-reports/${id}/approve`);
    } catch (error) {
      console.error(`Failed to approve report ${id}:`, error);
      throw error;
    }
  },
};

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
    STATS: schoolId => `/api/students/stats/${schoolId}`,
  },
  STUDENT_REPORTS: {
    BASE: '/api/student-reports',
    BY_STUDENT: studentId => `/api/student-reports/student/${studentId}`,
    MY_REPORTS: '/api/student-reports/my-reports',
    STATS: '/api/student-reports/stats',
    SUBMIT: id => `/api/student-reports/${id}/submit`,
    REVIEW: id => `/api/student-reports/${id}/review`,
    APPROVE: id => `/api/student-reports/${id}/approve`,
  },
};

// Error handling utilities
export const handleApiError = error => {
  console.error('API Error:', error);

  // Network errors
  if (error.isNetworkError) {
    return {
      message: 'Network error. Please check your internet connection.',
      type: 'network',
      retry: true,
    };
  }

  // Timeout errors
  if (error.isTimeout) {
    return {
      message: 'Request timed out. Please try again.',
      type: 'timeout',
      retry: true,
    };
  }

  // HTTP status errors
  switch (error.status) {
    case 400:
      return {
        message: error.data?.message || 'Invalid request. Please check your input.',
        type: 'validation',
        errors: error.data?.errors,
        retry: false,
      };

    case 401:
      return {
        message: 'Authentication required. Please log in again.',
        type: 'auth',
        retry: false,
      };

    case 403:
      return {
        message: 'You do not have permission to perform this action.',
        type: 'permission',
        retry: false,
      };

    case 404:
      return {
        message: 'The requested resource was not found.',
        type: 'notfound',
        retry: false,
      };

    case 409:
      return {
        message: error.data?.message || 'A conflict occurred. The resource may already exist.',
        type: 'conflict',
        retry: false,
      };

    case 422:
      return {
        message: error.data?.message || 'Validation failed.',
        type: 'validation',
        errors: error.data?.errors,
        retry: false,
      };

    case 429:
      return {
        message: 'Too many requests. Please wait a moment and try again.',
        type: 'ratelimit',
        retry: true,
        retryAfter: error.data?.retryAfter,
      };

    case 500:
      return {
        message: 'Server error. Please try again later.',
        type: 'server',
        retry: true,
      };

    case 502:
    case 503:
    case 504:
      return {
        message: 'Service temporarily unavailable. Please try again later.',
        type: 'service',
        retry: true,
      };

    default:
      return {
        message: error.message || 'An unexpected error occurred.',
        type: 'unknown',
        retry: true,
      };
  }
};

// Health check utility
export const healthCheck = async () => {
  try {
    const response = await api.get('/api/health', { timeout: 5000 });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const aiAnalysisHelpers = {
  // Check AI service status
  checkStatus: async () => {
    try {
      return await apiRequest.get('/api/ai-analysis/status');
    } catch (error) {
      console.error('Failed to check AI service status:', error);
      throw error;
    }
  },

  // Extract student data from file
  extractData: async (formData) => {
    try {
      return await api.post('/api/ai-analysis/extract', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minute timeout for AI processing
      });
    } catch (error) {
      console.error('Failed to extract student data:', error);
      throw error;
    }
  },

  // Import student data
  importData: async (importData) => {
    try {
      return await apiRequest.post('/api/ai-analysis/import', importData);
    } catch (error) {
      console.error('Failed to import student data:', error);
      throw error;
    }
  },

  // Get AI analysis statistics
  getStats: async (params = {}) => {
    try {
      return await apiRequest.get('/api/ai-analysis/stats', { params });
    } catch (error) {
      console.error('Failed to fetch AI analysis stats:', error);
      throw error;
    }
  },
};

// Export token manager for use in other files
export { tokenManager };

// Export the configured axios instance as default
export default api;
