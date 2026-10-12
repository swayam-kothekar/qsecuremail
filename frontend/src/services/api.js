/**
 * API Service
 * Handles all backend API calls
 */

import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '');
const API_BASE_URL = cleanBaseUrl.endsWith('/api') ? cleanBaseUrl : `${cleanBaseUrl}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('qsecuremail_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      // Token expired or invalid
      localStorage.removeItem('qsecuremail_token');
      localStorage.removeItem('qsecuremail_email');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, appPassword) => 
    api.post('/auth/login', { email, appPassword }),
  
  verify: () => 
    api.post('/auth/verify')
};

// Email API
export const emailAPI = {
  send: (to, subject, body, level, isEncrypted = true) =>
    api.post('/email/send', { to, subject, body, level, isEncrypted }),
  
  getInbox: (limit = 10, offset = 0) =>
    api.get(`/email/inbox?limit=${limit}&offset=${offset}`),
  
  getCount: () =>
    api.get('/email/count')
};

// ASPE API
export const aspeAPI = {
  getStatus: () =>
    api.get('/aspe/status'),
  
  calibrate: (params) =>
    api.post('/aspe/calibrate', params),
  
  getRecommendation: (messageSize) =>
    api.get(`/aspe/recommend?messageSize=${messageSize}`),
  
  validateLevel: (level, messageSize) =>
    api.post('/aspe/validate-level', { level, messageSize })
};

// KM API
export const kmAPI = {
  getStatus: () =>
    api.get('/km/status'),
  
  replenish: (count) =>
    api.post('/km/replenish', { count }),
  
  reset: () =>
    api.post('/km/reset')
};

// Audit API
export const auditAPI = {
  getLog: () =>
    api.get('/audit/log'),
  
  getRecent: (limit = 20) =>
    api.get(`/audit/recent?limit=${limit}`)
};

// Health API
export const healthAPI = {
  check: () =>
    api.get('/health')
};

export default api;
