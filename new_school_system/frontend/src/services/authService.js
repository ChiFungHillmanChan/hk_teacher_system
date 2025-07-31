// File: src/services/authService.js
import { apiRequest } from './api';

export const authService = {
  login: async (credentials) => {
    return await apiRequest.post('/api/auth/login', credentials);
  },

  register: async (userData) => {
    return await apiRequest.post('/api/auth/register', userData);
  },

  logout: async () => {
    return await apiRequest.post('/api/auth/logout');
  },

  getProfile: async () => {
    return await apiRequest.get('/api/auth/me');
  },

  updateProfile: async (userData) => {
    return await apiRequest.put('/api/auth/updatedetails', userData);
  },

  updatePassword: async (passwordData) => {
    return await apiRequest.put('/api/auth/updatepassword', passwordData);
  },

  forgotPassword: async (email) => {
    return await apiRequest.post('/api/auth/forgotpassword', { email });
  },

  resetPassword: async (token, password, confirmPassword) => {
    return await apiRequest.put(`/api/auth/resetpassword/${token}`, {
      password,
      confirmPassword,
    });
  },


  refreshToken: async (refreshToken) => {
    return await apiRequest.post('/api/auth/refresh', { refreshToken });
  },

  verifyEmail: async (token) => {
    return await apiRequest.get(`/api/auth/verify/${token}`);
  },

  verifyInviteCode: async (inviteCode) => {
    return await apiRequest.post('/api/auth/verify-invite', { inviteCode });
  }
};