import axios from 'axios';
import { API_BASE_URL } from './constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  // Users
  createUser: (userData: any) => api.post('/users', userData),
  getUser: (userId: string) => api.get(`/users/${userId}`),
  updateUser: (userId: string, data: any) => api.put(`/users/${userId}`, data),

  // Events
  logEvent: (userId: string, event: any) => api.post(`/users/${userId}/events`, event),
  getEvents: (userId: string, days?: number) => 
    api.get(`/users/${userId}/events`, { params: { days } }),
  getDashboard: (userId: string, days?: number) => 
    api.get(`/users/${userId}/dashboard`, { params: { days } }),

  // Triage
  runTriage: (userId: string) => api.post(`/users/${userId}/triage/run`),
  getStatus: (userId: string) => api.get(`/users/${userId}/status`),

  // Reports
  generateReport: (userId: string, periodDays: number = 7) => 
    api.post(`/users/${userId}/reports`, { period_days: periodDays }),
  downloadReport: (reportId: string) => 
    api.get(`/reports/${reportId}/download`, { responseType: 'blob' }),

  // Medications
  getMedications: (userId: string) => api.get(`/users/${userId}/medications`),
  getMedication: (userId: string, medId: string) => api.get(`/users/${userId}/medications/${medId}`),
  addMedication: (userId: string, med: any) => api.post(`/users/${userId}/medications`, med),
  updateMedication: (userId: string, medId: string, med: any) => 
    api.put(`/users/${userId}/medications/${medId}`, med),
  deleteMedication: (userId: string, medId: string) => 
    api.delete(`/users/${userId}/medications/${medId}`),
  activateMedication: (userId: string, medId: string) => 
    api.post(`/users/${userId}/medications/${medId}/activate`),
};

export default api;
