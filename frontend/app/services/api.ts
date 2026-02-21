/**
 * API Service for Chronic Health Buddy
 * Handles all backend communication
 */

const API_BASE = 'http://localhost:8000/api';

export interface UserCreateData {
  name: string;
  email: string;
  phone?: string;
  language: string;
  timezone: string;
  condition_profiles?: any[];
}

export interface EventData {
  type: 'vital' | 'symptom' | 'medication' | 'note';
  payload: any;
  source: 'web' | 'mobile' | 'voice' | 'api';
  language?: string;
  raw_text?: string;
}

export interface TriageResult {
  level: 'GREEN' | 'AMBER' | 'RED';
  score: number;
  reasons: string[];
  adherence_pct: number;
}

class ApiClient {
  private handleResponse = async (response: Response) => {
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }
    return response.json();
  };

  // ============ USER ENDPOINTS ============
  async createUser(userData: UserCreateData) {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return this.handleResponse(response);
  }

  async getUser(userId: string) {
    const response = await fetch(`${API_BASE}/users/${userId}`);
    return this.handleResponse(response);
  }

  async updateUser(userId: string, userData: Partial<UserCreateData>) {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return this.handleResponse(response);
  }

  // ============ EVENT ENDPOINTS ============
  async logEvent(userId: string, eventData: EventData) {
    const response = await fetch(`${API_BASE}/users/${userId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    return this.handleResponse(response);
  }

  async getUserEvents(userId: string, days: number = 7) {
    const response = await fetch(
      `${API_BASE}/users/${userId}/events?days=${days}`
    );
    return this.handleResponse(response);
  }

  // ============ DASHBOARD ENDPOINTS ============
  async getDashboard(userId: string) {
    const response = await fetch(`${API_BASE}/users/${userId}/dashboard`);
    return this.handleResponse(response);
  }

  // ============ TRIAGE ENDPOINTS ============
  async runTriage(userId: string): Promise<TriageResult> {
    const response = await fetch(`${API_BASE}/users/${userId}/triage/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return this.handleResponse(response);
  }

  async getTriageStatus(userId: string) {
    const response = await fetch(`${API_BASE}/users/${userId}/status`);
    return this.handleResponse(response);
  }

  // ============ REPORT ENDPOINTS ============
  async generateReport(userId: string, periodDays: number = 7) {
    const response = await fetch(`${API_BASE}/users/${userId}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period_days: periodDays }),
    });
    return this.handleResponse(response);
  }

  async getReport(reportId: string) {
    const response = await fetch(`${API_BASE}/reports/${reportId}`);
    return this.handleResponse(response);
  }

  async downloadReportPdf(reportId: string) {
    const response = await fetch(`${API_BASE}/reports/${reportId}/pdf`);
    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }
    return response.blob();
  }
}

export const api = new ApiClient();
