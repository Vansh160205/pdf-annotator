// api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
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

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verifyToken: () => api.post('/auth/verify'),
  getCurrentUser: () => api.get('/auth/me'),
};

// PDF API
export const pdfAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('pdf', file);
    return api.post('/pdf/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: () => api.get('/pdf/list'),
  get: (uuid) => api.get(`/pdf/${uuid}`, { responseType: 'arraybuffer', headers: { Accept: 'application/pdf' } }),
  delete: (uuid) => api.delete(`/pdf/${uuid}`),
  rename: (uuid, name) => api.patch(`/pdf/${uuid}/rename`, { name }),
};

// Highlight API
export const highlightAPI = {
  create: (highlightData) => api.post('/highlights', highlightData),
  getByPDF: (pdfUuid) => api.get(`/highlights/pdf/${pdfUuid}`),
  update: (uuid, data) => api.patch(`/highlights/${uuid}`, data),
  delete: (uuid) => api.delete(`/highlights/${uuid}`),
  getAll: () => api.get('/highlights'),
};

// Search API
export const searchAPI = {
  search: (params) => api.get('/search/search', { params }),
  advancedSearch: (data) => api.post('/search/advanced-search', data),
  getSuggestions: (query) => api.get('/search/suggestions', { params: { query } }),
  indexPdf: (pdfUuid) => api.post(`/search/index-pdf/${pdfUuid}`),
};

// Drawing API
export const drawingAPI = {
  create: (drawingData) => api.post('/drawings', drawingData),
  getByPDF: (pdfUuid) => api.get(`/drawings/pdf/${pdfUuid}`),
  getByPage: (pdfUuid, pageNumber) => api.get(`/drawings/pdf/${pdfUuid}/page/${pageNumber}`),
  update: (uuid, data) => api.patch(`/drawings/${uuid}`, data),
  delete: (uuid) => api.delete(`/drawings/${uuid}`),
  getAll: () => api.get('/drawings'),
  deleteByPDF: (pdfUuid) => api.delete(`/drawings/pdf/${pdfUuid}`),
};

// Cloud Storage API
export const cloudStorageAPI = {
  getAuthUrl: () => api.get('/cloud-storage/auth/url'),

  upload: ({ pdfUuid, accessToken, fileName }) =>
    api.post(`/cloud-storage/upload/${pdfUuid}`, { accessToken, fileName }),

  import: ({ fileId, accessToken, fileName }) =>
    api.post('/cloud-storage/import', { fileId, accessToken, fileName }),

  listFiles: ({ accessToken, pageToken }) =>
    api.get('/cloud-storage/files', { params: { accessToken, pageToken } }),

  getUserPDFs: () => api.get('/cloud-storage/user-pdfs'),

  getCloudFiles: (pdfUuid) => api.get(`/cloud-storage/files/${pdfUuid}`),

  deleteCloudFile: ({ cloudFileUuid, accessToken, deleteFromCloud }) =>
    api.delete(`/cloud-storage/files/${cloudFileUuid}`, { data: { accessToken, deleteFromCloud } }),
};

export default api;