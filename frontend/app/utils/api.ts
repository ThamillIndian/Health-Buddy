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
  getAdherenceLogs: (userId: string, days?: number, status?: string) => 
    api.get(`/users/${userId}/adherence-logs`, { params: { days, status } }),

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
  markMedicationTaken: (userId: string, medId: string, scheduledTime?: string) => 
    api.post(`/users/${userId}/medications/${medId}/mark-taken`, scheduledTime ? { scheduled_time: scheduledTime } : {}),
  checkMissedMedications: (userId: string) => 
    api.post(`/users/${userId}/medications/check-missed`),

  // Voice/Transcription
  transcribeAudio: (audioFile: File, language: string = 'en-IN', mode: string = 'transcribe') => {
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('language', language);
    formData.append('mode', mode);
    return api.post('/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  normalizeText: (text: string, language: string = 'en') => {
    const formData = new FormData();
    formData.append('text', text);
    formData.append('language', language);
    return api.post('/normalize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default api;
