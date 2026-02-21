'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/app/utils/api';
import { STATUS_COLORS, STATUS_MESSAGES } from '@/app/utils/constants';

interface DashboardMetrics {
  adherence_pct: number;
  avg_bp: string;
  bp_trend: string;
  avg_glucose: number | null;
  glucose_trend: string;
  recent_symptoms: string[];
  alerts_count: number;
}

interface RecentAlert {
  id: string;
  level: string;
  score: number;
  reason_codes: string[];
  timestamp: string;
  dismissed: boolean;
}

interface RecentEvent {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
  source: string;
}

interface DashboardData {
  status: string;
  score: number;
  metrics: DashboardMetrics;
  recent_alerts: RecentAlert[];
  recent_events: RecentEvent[];
  timestamp: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
          router.push('/auth');
          return;
        }

        const response = await apiClient.getDashboard(userId);
        setDashboard(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load dashboard');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your health dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded">
            <p className="text-red-700 font-semibold">❌ Error Loading Dashboard</p>
            <p className="text-red-600 text-sm mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600">No data available. Start logging your health!</p>
        </div>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[dashboard.status as keyof typeof STATUS_COLORS] || 'bg-green-500';
  const statusMessage = STATUS_MESSAGES[dashboard.status as keyof typeof STATUS_MESSAGES] || '✅ All Good!';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">📊 Your Health Dashboard</h1>
          <p className="text-gray-600">Stay informed about your health status</p>
        </div>

        {/* Status Card */}
        <div className={`${statusColor} text-white rounded-lg shadow-lg p-8 mb-8 text-center`}>
          <div className="text-6xl mb-4">
            {dashboard.status === 'green' && '✅'}
            {dashboard.status === 'amber' && '⚠️'}
            {dashboard.status === 'red' && '🚨'}
          </div>
          <h2 className="text-3xl font-bold mb-2">
            {dashboard.status.toUpperCase()}
          </h2>
          <p className="text-lg opacity-90">{statusMessage}</p>
          <div className="mt-4 text-sm opacity-75">
            Risk Score: <span className="font-bold">{Math.round(dashboard.score)}/100</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Adherence */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-700">Medication Adherence</h3>
              <span className="text-2xl">💊</span>
            </div>
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(dashboard.metrics.adherence_pct, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {Math.round(dashboard.metrics.adherence_pct)}%
            </div>
            <p className="text-xs text-gray-500 mt-2">Medications taken on time</p>
          </div>

          {/* Blood Pressure */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-700">Blood Pressure</h3>
              <span className="text-2xl">❤️</span>
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {dashboard.metrics.avg_bp}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold px-2 py-1 rounded ${
                dashboard.metrics.bp_trend === 'rising' ? 'bg-red-100 text-red-700' :
                dashboard.metrics.bp_trend === 'falling' ? 'bg-green-100 text-green-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {dashboard.metrics.bp_trend === 'rising' && '📈 Rising'}
                {dashboard.metrics.bp_trend === 'falling' && '📉 Falling'}
                {dashboard.metrics.bp_trend === 'stable' && '➡️ Stable'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Latest reading</p>
          </div>

          {/* Glucose */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-700">Glucose Level</h3>
              <span className="text-2xl">🍬</span>
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {dashboard.metrics.avg_glucose ? `${Math.round(dashboard.metrics.avg_glucose)} mg/dL` : 'N/A'}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold px-2 py-1 rounded ${
                dashboard.metrics.glucose_trend === 'rising' ? 'bg-red-100 text-red-700' :
                dashboard.metrics.glucose_trend === 'falling' ? 'bg-green-100 text-green-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {dashboard.metrics.glucose_trend === 'rising' && '📈 Rising'}
                {dashboard.metrics.glucose_trend === 'falling' && '📉 Falling'}
                {dashboard.metrics.glucose_trend === 'stable' && '➡️ Stable'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Average of recent readings</p>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-700">Active Alerts</h3>
              <span className="text-2xl">🔔</span>
            </div>
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {dashboard.metrics.alerts_count}
            </div>
            {dashboard.metrics.alerts_count > 0 ? (
              <p className="text-xs text-orange-600">Needs attention</p>
            ) : (
              <p className="text-xs text-green-600">All clear</p>
            )}
          </div>
        </div>

        {/* Recent Alerts */}
        {dashboard.recent_alerts && dashboard.recent_alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="font-bold text-gray-800 mb-4 text-lg">⚠️ Recent Alerts</h3>
            <div className="space-y-3">
              {dashboard.recent_alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.level === 'red' ? 'bg-red-50 border-red-500' :
                    alert.level === 'amber' ? 'bg-yellow-50 border-yellow-500' :
                    'bg-green-50 border-green-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-800">
                        {alert.level === 'red' && '🚨'}
                        {alert.level === 'amber' && '⚠️'}
                        {alert.level === 'green' && '✅'}
                        {' '}{alert.level.toUpperCase()} - Score: {Math.round(alert.score)}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {alert.reason_codes.join(', ')}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Symptoms */}
        {dashboard.metrics.recent_symptoms && dashboard.metrics.recent_symptoms.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="font-bold text-gray-800 mb-4 text-lg">😷 Recent Symptoms</h3>
            <div className="flex flex-wrap gap-2">
              {dashboard.metrics.recent_symptoms.map((symptom, idx) => (
                <span
                  key={idx}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {symptom}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activities */}
        {dashboard.recent_events && dashboard.recent_events.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-800 mb-4 text-lg">📋 Recent Activities</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dashboard.recent_events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-4 p-3 border-b border-gray-100 last:border-b-0"
                >
                  <span className="text-2xl">
                    {event.type === 'vital' && '📊'}
                    {event.type === 'symptom' && '😷'}
                    {event.type === 'medication' && '💊'}
                    {event.type === 'note' && '📝'}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 capitalize">
                      {event.type} Logged
                    </p>
                    <p className="text-sm text-gray-600">
                      {JSON.stringify(event.payload)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
