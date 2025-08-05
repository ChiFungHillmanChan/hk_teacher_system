// File: src/services/authService.js
import { apiRequest } from './api';

export const authService = {
  login: async credentials => {
    return await apiRequest.post('/auth/login', credentials);
  },

  register: async userData => {
    return await apiRequest.post('/auth/register', userData);
  },

  logout: async () => {
    return await apiRequest.post('/auth/logout');
  },

  getProfile: async () => {
    return await apiRequest.get('/auth/me');
  },

  updateProfile: async userData => {
    return await apiRequest.put('/auth/updatedetails', userData);
  },

  updatePassword: async passwordData => {
    return await apiRequest.put('/auth/updatepassword', passwordData);
  },

  forgotPassword: async email => {
    return await apiRequest.post('/auth/forgotpassword', { email });
  },

  resetPassword: async (token, password, confirmPassword) => {
    return await apiRequest.put(`/auth/resetpassword/${token}`, {
      password,
      confirmPassword,
    });
  },

  refreshToken: async refreshToken => {
    return await apiRequest.post('/auth/refresh', { refreshToken });
  },

  verifyEmail: async token => {
    return await apiRequest.get(`/auth/verify/${token}`);
  },

  verifyInviteCode: async inviteCode => {
    return await apiRequest.post('/auth/verify-invite', { inviteCode });
  },
};
