import axios from 'axios';

let globalRateLimitHandler = null;

export const setGlobalRateLimitHandler = handler => {
  globalRateLimitHandler = handler;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
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
          `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/auth/refresh`,
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
      const result = await apiRequest.get('/schools', { params });
      return result;
    } catch (error) {
      console.error('❌ Failed to fetch schools:', error);
      throw error;
    }
  },

  getById: async id => {
    try {
      console.log('🔍 Fetching school by ID:', id);
      const result = await apiRequest.get(`/schools/${id}`);
      console.log('✅ School fetched successfully:', result?.name);
      return result;
    } catch (error) {
      console.error(`❌ Failed to fetch school ${id}:`, error);
      throw error;
    }
  },

  create: async schoolData => {
    try {
      console.log('➕ Creating school:', schoolData?.name);
      const result = await apiRequest.post('/schools', schoolData);
      console.log('✅ School created successfully:', result?.name);
      return result;
    } catch (error) {
      console.error('❌ Failed to create school:', error);
      throw error;
    }
  },

  update: async (id, schoolData) => {
    try {
      console.log('📝 Updating school:', id, schoolData);

      // Log the exact data being sent
      console.log('Update payload:', JSON.stringify(schoolData, null, 2));

      const result = await apiRequest.put(`/schools/${id}`, schoolData);
      console.log('✅ School updated successfully:', result?.name);
      return result;
    } catch (error) {
      console.error(`❌ Failed to update school ${id}:`, error);

      // Log detailed error information
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
      }

      throw error;
    }
  },

  delete: async id => {
    try {
      console.log('🗑️ Deleting school:', id);

      // First check if school exists and get details
      const schoolToDelete = await apiRequest.get(`/schools/${id}`);
      console.log('School to delete:', schoolToDelete?.name);

      const result = await apiRequest.delete(`/schools/${id}`);
      console.log('✅ School deleted successfully');
      return result;
    } catch (error) {
      console.error(`❌ Failed to delete school ${id}:`, error);

      // Enhanced error logging for delete operation
      if (error.response?.status === 404) {
        console.error('School not found for deletion');
      } else if (error.response?.status === 403) {
        console.error('Permission denied for school deletion');
      } else if (error.response?.status === 409) {
        console.error('Cannot delete school - may have associated data');
      }

      throw error;
    }
  },

  getStats: async id => {
    try {
      const result = await apiRequest.get(`/schools/${id}/stats`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to fetch school stats for ${id}:`, error);
      throw error;
    }
  },

  getAvailableAcademicYears: async schoolId => {
    try {
      const result = await apiRequest.get(`/schools/${schoolId}/academic-years-available`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to fetch academic years for school ${schoolId}:`, error);
      throw error;
    }
  },
};

// Student management helpers
export const studentHelpers = {
  getAll: async (params = {}) => {
    try {
      console.log('🔍 Fetching all students with params:', params);
      const result = await apiRequest.get('/students', { params });
      console.log(`✅ Students fetched successfully: ${result?.length || 0} students`);
      return result;
    } catch (error) {
      console.error('❌ Failed to fetch students:', error);
      throw error;
    }
  },

  getById: async id => {
    try {
      console.log('🔍 Fetching student by ID:', id);
      const result = await apiRequest.get(`/students/${id}`);
      console.log('✅ Student fetched successfully:', result?.name);
      return result;
    } catch (error) {
      console.error(`❌ Failed to fetch student ${id}:`, error);
      throw error;
    }
  },

  create: async studentData => {
    try {
      console.log('➕ Creating student:', studentData?.name);

      // Log the exact data being sent for debugging
      console.log(
        'Student creation payload:',
        JSON.stringify(
          {
            name: studentData.name,
            school: studentData.school,
            grade: studentData.grade,
            class: studentData.class,
            classNumber: studentData.classNumber,
          },
          null,
          2
        )
      );

      const result = await apiRequest.post('/students', studentData);
      console.log('✅ Student created successfully:', result?.name, 'ID:', result?._id);
      return result;
    } catch (error) {
      console.error('❌ Failed to create student:', error);

      // Log detailed error information for debugging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
      }

      // Re-throw with more context
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error(`創建學生失敗: ${errorMessage}`);
    }
  },

  update: async (id, studentData) => {
    try {
      console.log('📝 Updating student:', id, studentData?.name);

      // Log the exact data being sent for debugging
      console.log('Student update payload:', JSON.stringify(studentData, null, 2));

      const result = await apiRequest.put(`/students/${id}`, studentData);
      console.log('✅ Student updated successfully:', result?.name);
      return result;
    } catch (error) {
      console.error(`❌ Failed to update student ${id}:`, error);

      // Log detailed error information
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
      }

      // Re-throw with more context
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      throw new Error(`更新學生失敗: ${errorMessage}`);
    }
  },

  delete: async id => {
    try {
      console.log('🗑️ Deleting student:', id);

      // First check if student exists and get details
      const studentToDelete = await apiRequest.get(`/students/${id}`);
      console.log('Student to delete:', studentToDelete?.name);

      const result = await apiRequest.delete(`/students/${id}`);
      console.log('✅ Student deleted successfully');
      return result;
    } catch (error) {
      console.error(`❌ Failed to delete student ${id}:`, error);

      // Enhanced error logging for delete operation
      if (error.response?.status === 404) {
        console.error('Student not found for deletion');
      } else if (error.response?.status === 403) {
        console.error('Permission denied for student deletion');
      } else if (error.response?.status === 409) {
        console.error('Cannot delete student - may have associated data');
      }

      throw error;
    }
  },

  getMyStudents: async (params = {}) => {
    try {
      console.log('🔍 Fetching my students');
      const result = await apiRequest.get('/students/my-students', { params });
      console.log(`✅ My students fetched successfully: ${result?.length || 0} students`);
      return result;
    } catch (error) {
      console.error('❌ Failed to fetch my students:', error);
      throw error;
    }
  },

  getStatsBySchool: async schoolId => {
    try {
      console.log('📊 Fetching student stats for school:', schoolId);
      const result = await apiRequest.get(`/students/stats/${schoolId}`);
      console.log('✅ Student stats fetched successfully');
      return result;
    } catch (error) {
      console.error(`❌ Failed to fetch student stats for school ${schoolId}:`, error);
      throw error;
    }
  },

  addTeacher: async (studentId, teacherData) => {
    try {
      console.log('👨‍🏫 Adding teacher to student:', studentId);
      const result = await apiRequest.post(`/students/${studentId}/teachers`, teacherData);
      console.log('✅ Teacher added to student successfully');
      return result;
    } catch (error) {
      console.error(`❌ Failed to add teacher to student ${studentId}:`, error);
      throw error;
    }
  },

  removeTeacher: async (studentId, teacherId) => {
    try {
      console.log('🗑️ Removing teacher from student:', studentId, teacherId);
      const result = await apiRequest.delete(`/students/${studentId}/teachers/${teacherId}`);
      console.log('✅ Teacher removed from student successfully');
      return result;
    } catch (error) {
      console.error(`❌ Failed to remove teacher from student ${studentId}:`, error);
      throw error;
    }
  },

  searchByName: async (name, params = {}) => {
    try {
      console.log('🔍 Searching students by name:', name);
      const allParams = { ...params, search: name };
      const result = await apiRequest.get('/students', { params: allParams });
      console.log(`✅ Student search completed: ${result?.length || 0} results`);
      return result;
    } catch (error) {
      console.error('❌ Failed to search students by name:', error);
      throw error;
    }
  },

  searchBySchool: async (schoolId, params = {}) => {
    try {
      console.log('🔍 Searching students by school:', schoolId);
      const allParams = { ...params, school: schoolId };
      const result = await apiRequest.get('/students', { params: allParams });
      console.log(`✅ School student search completed: ${result?.length || 0} results`);
      return result;
    } catch (error) {
      console.error('❌ Failed to search students by school:', error);
      throw error;
    }
  },

  searchByGrade: async (grade, params = {}) => {
    try {
      console.log('🔍 Searching students by grade:', grade);
      const allParams = { ...params, grade };
      const result = await apiRequest.get('/students', { params: allParams });
      console.log(`✅ Grade student search completed: ${result?.length || 0} results`);
      return result;
    } catch (error) {
      console.error('❌ Failed to search students by grade:', error);
      throw error;
    }
  },

  batchCreate: async (studentsData, onProgress) => {
    try {
      console.log(`🔄 Batch creating ${studentsData.length} students`);

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const [index, studentData] of studentsData.entries()) {
        try {
          if (onProgress) {
            onProgress({
              current: index,
              total: studentsData.length,
              currentStudent: studentData.name,
              message: `創建學生: ${studentData.name}`,
            });
          }

          const result = await studentHelpers.create(studentData);
          results.push({
            index,
            success: true,
            data: result,
            studentData,
          });
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to create student ${index}:`, error);
          results.push({
            index,
            success: false,
            error: error.message,
            studentData,
          });
          failureCount++;
        }
      }

      console.log(`✅ Batch create completed: ${successCount} success, ${failureCount} failed`);

      return {
        results,
        successCount,
        failureCount,
        totalProcessed: successCount + failureCount,
      };
    } catch (error) {
      console.error('❌ Failed to batch create students:', error);
      throw error;
    }
  },

  batchUpdate: async (updates, onProgress) => {
    try {
      console.log(`🔄 Batch updating ${updates.length} students`);

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const [index, { id, data }] of updates.entries()) {
        try {
          if (onProgress) {
            onProgress({
              current: index,
              total: updates.length,
              currentStudent: data.name || id,
              message: `更新學生: ${data.name || id}`,
            });
          }

          const result = await studentHelpers.update(id, data);
          results.push({
            index,
            success: true,
            data: result,
            updateData: data,
          });
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to update student ${id}:`, error);
          results.push({
            index,
            success: false,
            error: error.message,
            updateData: data,
            studentId: id,
          });
          failureCount++;
        }
      }

      console.log(`✅ Batch update completed: ${successCount} success, ${failureCount} failed`);

      return {
        results,
        successCount,
        failureCount,
        totalProcessed: successCount + failureCount,
      };
    } catch (error) {
      console.error('❌ Failed to batch update students:', error);
      throw error;
    }
  },
};

export const studentReportHelpers = {
  // Get all student reports
  getAll: async (params = {}) => {
    try {
      return await apiRequest.get('/student-reports', { params });
    } catch (error) {
      console.error('Failed to fetch student reports:', error);
      throw error;
    }
  },

  // Get single student report
  getById: async id => {
    try {
      console.log('🔍 Fetching student report by ID:', id);
      const response = await api.get(`/student-reports/${id}`);

      // Handle the response structure properly
      const reportData = response.data?.data || response.data;

      console.log('✅ Student report fetched successfully:', reportData?.subjectDetails?.topic);
      return reportData;
    } catch (error) {
      console.error(`❌ Failed to fetch student report ${id}:`, error);
      throw error;
    }
  },

  // Create new student report
  create: async reportData => {
    try {
      return await apiRequest.post('/student-reports', reportData);
    } catch (error) {
      console.error('Failed to create student report:', error);
      throw error;
    }
  },

  // Update student report
  update: async (id, reportData) => {
    try {
      console.log('📝 Updating student report:', id);
      console.log('📤 Update payload:', JSON.stringify(reportData, null, 2));

      // Use direct axios call for better control over response handling
      const response = await api.put(`/student-reports/${id}`, reportData);

      console.log('📥 Raw update response:', response.data);

      // Handle the response structure properly
      const updatedData = response.data?.data || response.data;

      console.log('✅ Student report updated successfully:', updatedData?.subjectDetails?.topic);
      return updatedData;
    } catch (error) {
      console.error(`❌ Failed to update student report ${id}:`, error);

      // Enhanced error logging for debugging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
      }

      throw error;
    }
  },

  // Delete student report
  delete: async id => {
    try {
      return await apiRequest.delete(`/student-reports/${id}`);
    } catch (error) {
      console.error(`Failed to delete student report ${id}:`, error);
      throw error;
    }
  },

  // Get reports by student
  getByStudent: async (studentId, params = {}) => {
    try {
      return await apiRequest.get(`/student-reports/student/${studentId}`, { params });
    } catch (error) {
      console.error(`Failed to fetch reports for student ${studentId}:`, error);
      throw error;
    }
  },

  // Get my reports (for teachers)
  getMyReports: async (params = {}) => {
    try {
      return await apiRequest.get('/student-reports/my-reports', { params });
    } catch (error) {
      console.error('Failed to fetch my reports:', error);
      throw error;
    }
  },

  // Get report statistics
  getStats: async (params = {}) => {
    try {
      return await apiRequest.get('/student-reports/stats', { params });
    } catch (error) {
      console.error('Failed to fetch report statistics:', error);
      throw error;
    }
  },

  // Report status management
  submit: async id => {
    try {
      return await apiRequest.put(`/student-reports/${id}/submit`);
    } catch (error) {
      console.error(`Failed to submit report ${id}:`, error);
      throw error;
    }
  },

  review: async id => {
    try {
      return await apiRequest.put(`/student-reports/${id}/review`);
    } catch (error) {
      console.error(`Failed to review report ${id}:`, error);
      throw error;
    }
  },

  approve: async id => {
    try {
      return await apiRequest.put(`/student-reports/${id}/approve`);
    } catch (error) {
      console.error(`Failed to approve report ${id}:`, error);
      throw error;
    }
  },
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
  },
  SCHOOLS: {
    BASE: '/schools',
    STATS: id => `/schools/${id}/stats`,
  },
  STUDENTS: {
    BASE: '/students',
    MY_STUDENTS: '/students/my-students',
    STATS: schoolId => `/students/stats/${schoolId}`,
  },
  STUDENT_REPORTS: {
    BASE: '/student-reports',
    BY_STUDENT: studentId => `/student-reports/student/${studentId}`,
    MY_REPORTS: '/student-reports/my-reports',
    STATS: '/student-reports/stats',
    SUBMIT: id => `/student-reports/${id}/submit`,
    REVIEW: id => `/student-reports/${id}/review`,
    APPROVE: id => `/student-reports/${id}/approve`,
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
    const response = await api.get('/health', { timeout: 5000 });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const aiAnalysisHelpers = {
  // Check AI service status
  checkStatus: async () => {
    try {
      return await apiRequest.get('/ai-analysis/status');
    } catch (error) {
      console.error('Failed to check AI service status:', error);
      throw error;
    }
  },

  // Extract student data from file
  extractData: async formData => {
    try {
      return await api.post('/ai-analysis/extract', formData, {
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
  importData: async importData => {
    try {
      return await apiRequest.post('/ai-analysis/import', importData);
    } catch (error) {
      console.error('Failed to import student data:', error);
      throw error;
    }
  },

  // Get AI analysis statistics
  getStats: async (params = {}) => {
    try {
      return await apiRequest.get('/ai-analysis/stats', { params });
    } catch (error) {
      console.error('Failed to fetch AI analysis stats:', error);
      throw error;
    }
  },
};

export const meetingRecordHelpers = {
  getAll: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/meeting-records?${queryString}` : '/meeting-records';

      // Use direct axios call to avoid unwrap issues
      const response = await api.get(url);

      // Handle response structure
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data || [];
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getById: async id => {
    try {
      const response = await api.get(`/meeting-records/${id}`);

      // Handle response structure
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  create: async data => {
    try {
      const response = await api.post('/meeting-records', data);

      // Handle response structure
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.put(`/meeting-records/${id}`, data);

      // Handle response structure
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  delete: async id => {
    try {
      const response = await api.delete(`/meeting-records/${id}`);

      // Handle response structure
      if (response.data?.success) {
        return response.data;
      }
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // FIXED: Special handling for getByStudent to match backend response
  getByStudent: async (studentId, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString
        ? `/meeting-records/student/${studentId}?${queryString}`
        : `/meeting-records/student/${studentId}`;

      console.log('🔍 Making API call to:', url);
      console.log('📤 With params:', params);

      // Use direct axios call to get full response structure
      const response = await api.get(url);

      console.log('📥 Raw API response:', response.data);

      // Return the full response to let the component handle structure
      return response.data;
    } catch (error) {
      console.error('❌ API Error in getByStudent:', error);
      throw handleApiError(error);
    }
  },

  getStats: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `/meeting-records/stats?${queryString}` : '/meeting-records/stats';

      const response = await api.get(url);

      // Handle response structure
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data || {};
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getByYear: async (schoolId, academicYear, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString
        ? `/meeting-records/by-year/${schoolId}/${academicYear}?${queryString}`
        : `/meeting-records/by-year/${schoolId}/${academicYear}`;

      const response = await api.get(url);

      // Handle response structure
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data || [];
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Export token manager for use in other files
export { tokenManager };

// Export the configured axios instance as default
export default api;
