// src/services/api.js - UITBREIDING
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
});

// Voeg token toe aan elke request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ✅ Auth services (VOEG DIT TOE)
export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  logout: () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.Authorization;
  }
};

// ✅ Task services (je had dit al)
export const taskService = {
  getTodayTasks: (date) => api.get(`/tasks/today?date=${date}`),
  getAllTasks: () => api.get('/tasks'),
  createTask: (data) => api.post('/tasks', data),
};

// ✅ Daily Log services (je had dit al)
export const dailyLogService = {
  getLogs: (date) => api.get(`/daily-logs?date=${date}`),
  createLog: (data) => api.post('/daily-logs', data),
  updateLog: (id, data) => api.patch(`/daily-logs/${id}`, data),
};

// ✅ Inventory services (admin only) (je had dit al)
export const inventoryService = {
  getFeedItems: () => api.get('/inventory/feed-items'),
  getWarnings: (params) => api.get('/admin/inventory-warnings', { params }),
};

// ✅ Admin services (VOEG DIT TOE)
export const adminService = {
  getDailyOverview: (date) => api.get(`/admin/daily-overview?date=${date}`),
};

export default api;