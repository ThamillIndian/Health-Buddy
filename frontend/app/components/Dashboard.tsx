'use client';

import { useHealthData } from '@/app/hooks/useHealthData';
import { STATUS_COLORS, STATUS_MESSAGES } from '@/app/utils/constants';
import { apiClient } from '@/app/utils/api';
import { useState, useEffect } from 'react';
import TriageComponent from './TriageComponent';
import AIInsights from './AIInsights';
import TrendsChart from './TrendsChart';
import AchievementBadges from './AchievementBadges';
import QuickActionFAB from './QuickActionFAB';

interface DashboardProps {
  userId: string;
  refreshTrigger?: number;
}

export default function Dashboard({ userId, refreshTrigger }: DashboardProps) {
  const { dashboard, loading, error } = useHealthData(userId);
  const [reportLoading, setReportLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Check for saved dark mode preference
    const saved = localStorage.getItem('darkMode');
    if (saved) {
      setDarkMode(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Refresh trends when data changes
    setRefreshKey(k => k + 1);
  }, [refreshTrigger]);

  const handleDownloadPDF = async () => {
    try {
      setReportLoading(true);
      const response = await apiClient.generateReport(userId, 7);
      
      // Trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `health_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      console.error('Failed to download report:', error);
    } finally {
      setReportLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
  };

  if (loading) {
    return (
      <div className={`${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'} min-h-screen`}>
        <div className="max-w-2xl mx-auto p-4">
          <div className="text-center py-12">
            <div className="inline-block animate-spin text-3xl">⏳</div>
            <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Loading dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'} min-h-screen`}>
        <div className="max-w-2xl mx-auto p-4">
          <div className={`${darkMode ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200'} border p-4 rounded-lg`}>
            <p className={`${darkMode ? 'text-red-300' : 'text-red-700'}`}>Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className={`${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'} min-h-screen`}>
        <div className="max-w-2xl mx-auto p-4">
          <div className="text-center py-12">
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No data available. Start logging your health!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusColor = dashboard.status === 'green' ? 'green' : 
                      dashboard.status === 'amber' ? 'amber' : 'red';
  const statusBg = STATUS_COLORS[statusColor as keyof typeof STATUS_COLORS];

  return (
    <div className={`${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'} min-h-screen`}>
      <div className={`${darkMode ? 'dark' : ''} max-w-4xl mx-auto p-4`}>
        {/* Header with Dark Mode Toggle */}
        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            🏥 Health Dashboard
          </h1>
          <button
            onClick={toggleDarkMode}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              darkMode
                ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-600'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
        {/* Status Banner - Enhanced */}
        <div className={`${statusBg} text-white p-6 rounded-lg mb-6 shadow-xl border-l-4`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                {STATUS_MESSAGES[statusColor as keyof typeof STATUS_MESSAGES]}
              </h2>
              <p className="text-lg opacity-95">Risk Score: {dashboard.score.toFixed(1)}/100</p>
              {dashboard.metrics.recent_symptoms.length > 0 && (
                <p className="text-sm mt-2 opacity-90">
                  Symptoms: {dashboard.metrics.recent_symptoms.join(', ')}
                </p>
              )}
            </div>
            <div className="text-4xl">{statusColor === 'green' ? '✅' : statusColor === 'amber' ? '⚠️' : '🚨'}</div>
          </div>
        </div>

        {/* Trends Chart */}
        <TrendsChart key={refreshKey} userId={userId} days={7} />

        {/* Achievement Badges */}
        <AchievementBadges
          adherence={dashboard.metrics.adherence_pct || 0}
          daysLogged={dashboard.metrics.days_logged || 0}
          alertsFree={statusColor === 'green'}
          streak={dashboard.metrics.consecutive_streak || 0}
        />

        {/* Metrics Grid - Enhanced Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Adherence */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-lg border shadow-md hover:shadow-lg transition-all`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                💊 Medication Adherence
              </h3>
              <span className={`text-2xl font-bold ${dashboard.metrics.adherence_pct! >= 90 ? 'text-green-600' : 'text-blue-600'}`}>
                {dashboard.metrics.adherence_pct?.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all ${
                  dashboard.metrics.adherence_pct! >= 90
                    ? 'bg-gradient-to-r from-green-400 to-green-600'
                    : 'bg-gradient-to-r from-blue-400 to-blue-600'
                }`}
                style={{ width: `${dashboard.metrics.adherence_pct || 0}%` }}
              />
            </div>
          </div>

          {/* BP */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-lg border shadow-md hover:shadow-lg transition-all`}>
            <h3 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              ❤️ Blood Pressure
            </h3>
            <div className="text-3xl font-bold text-red-600 mb-2">
              {dashboard.metrics.avg_bp || 'N/A'}
            </div>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Trend: {dashboard.metrics.bp_trend} {dashboard.metrics.bp_trend === 'stable' ? '→' : dashboard.metrics.bp_trend === 'increasing' ? '↑' : '↓'}
            </p>
          </div>

          {/* Glucose */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-lg border shadow-md hover:shadow-lg transition-all`}>
            <h3 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              🩸 Glucose Level
            </h3>
            <div className="text-3xl font-bold text-amber-600 mb-2">
              {dashboard.metrics.avg_glucose?.toFixed(0) || 'N/A'} mg/dL
            </div>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Trend: {dashboard.metrics.glucose_trend} {dashboard.metrics.glucose_trend === 'stable' ? '→' : dashboard.metrics.glucose_trend === 'increasing' ? '↑' : '↓'}
            </p>
          </div>

          {/* Alerts */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-lg border shadow-md hover:shadow-lg transition-all`}>
            <h3 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              ⚠️ This Week
            </h3>
            <div className={`text-3xl font-bold mb-2 ${dashboard.metrics.alerts_count > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {dashboard.metrics.alerts_count}
            </div>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {dashboard.metrics.alerts_count > 0 ? 'Alerts to review' : 'No alerts!'}
            </p>
          </div>
        </div>

      {/* Triage Component */}
      <div className="mb-6">
        <TriageComponent userId={userId} />
      </div>

      {/* AI Insights */}
      <div className="mb-6">
        <AIInsights userId={userId} />
      </div>

      {/* Recent Alerts */}
      {dashboard.recent_alerts && dashboard.recent_alerts.length > 0 && (
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-6 rounded-lg border mb-6 shadow-md`}>
          <h3 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-4`}>
            🚨 Recent Alerts
          </h3>
          <div className="space-y-3">
            {dashboard.recent_alerts.slice(0, 5).map((alert: any) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${
                  alert.level === 'red'
                    ? darkMode
                      ? 'bg-red-900 border-red-700'
                      : 'bg-red-50 border-red-200'
                    : darkMode
                    ? 'bg-amber-900 border-amber-700'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`font-semibold ${alert.level === 'red' ? 'text-red-600' : 'text-amber-600'}`}>
                    {alert.level === 'red' ? '🚨' : '⚠️'} {alert.level.toUpperCase()}
                  </span>
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {new Date(alert.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className={`text-sm mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {alert.reason_codes.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mb-20">
        <button
          onClick={handleDownloadPDF}
          disabled={reportLoading}
          className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all shadow-md hover:shadow-lg"
        >
          {reportLoading ? '⏳ Generating...' : '📥 Download PDF Report'}
        </button>
      </div>

      {/* Quick Action FAB */}
      <QuickActionFAB userId={userId} onDataLogged={() => setRefreshKey(k => k + 1)} />
    </div>
    </div>
  );
}
