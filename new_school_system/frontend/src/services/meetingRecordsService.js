// services/meetingRecordsService.js
import { apiRequest } from './api';

export const meetingRecordsService = {
  // Get all meeting records with filtering
  getAll: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/api/meeting-records?${queryString}` : '/api/meeting-records';
    return await apiRequest.get(url);
  },

  // Get single meeting record
  getById: async (id) => {
    return await apiRequest.get(`/api/meeting-records/${id}`);
  },

  // Create new meeting record
  create: async (data) => {
    return await apiRequest.post('/api/meeting-records', data);
  },

  // Update meeting record
  update: async (id, data) => {
    return await apiRequest.put(`/api/meeting-records/${id}`, data);
  },

  // Delete meeting record
  delete: async (id) => {
    return await apiRequest.delete(`/api/meeting-records/${id}`);
  },

  // Get meetings by student
  getByStudent: async (studentId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString 
      ? `/api/meeting-records/student/${studentId}?${queryString}` 
      : `/api/meeting-records/student/${studentId}`;
    return await apiRequest.get(url);
  },

  // Get meeting statistics
  getStats: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `/api/meeting-records/stats?${queryString}` : '/api/meeting-records/stats';
    return await apiRequest.get(url);
  },

  // Get meetings by academic year
  getByYear: async (schoolId, academicYear, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString 
      ? `/api/meeting-records/by-year/${schoolId}/${academicYear}?${queryString}`
      : `/api/meeting-records/by-year/${schoolId}/${academicYear}`;
    return await apiRequest.get(url);
  },
};

// Export as part of the main API helpers (add this to your existing api.js)
export const meetingRecordHelpers = {
  getAll: meetingRecordsService.getAll,
  getById: meetingRecordsService.getById,
  create: meetingRecordsService.create,
  update: meetingRecordsService.update,
  delete: meetingRecordsService.delete,
  getByStudent: meetingRecordsService.getByStudent,
  getStats: meetingRecordsService.getStats,
  getByYear: meetingRecordsService.getByYear,
};