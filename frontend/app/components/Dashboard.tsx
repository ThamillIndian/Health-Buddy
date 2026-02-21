'use client';

import { useHealthData } from '@/app/hooks/useHealthData';
import { STATUS_COLORS, STATUS_MESSAGES } from '@/app/utils/constants';
import { apiClient } from '@/app/utils/api';
import { useState } from 'react';

interface DashboardProps {
  userId: string;
  refreshTrigger?: number;
}

export default function Dashboard({ userId, refreshTrigger }: DashboardProps) {
  const { dashboard, loading, error } = useHealthData(userId);
  const [reportLoading, setReportLoading] = useState(false);

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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-12">
          <div className="inline-block animate-spin">⏳</div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-red-700">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-12">
          <p className="text-gray-600">No data available. Start logging your health!</p>
        </div>
      </div>
    );
  }

  const statusColor = dashboard.status === 'green' ? 'green' : 
                      dashboard.status === 'amber' ? 'amber' : 'red';
  const statusBg = STATUS_COLORS[statusColor as keyof typeof STATUS_COLORS];

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Status Banner */}
      <div className={`${statusBg} text-white p-6 rounded-lg mb-6 shadow-lg`}>
        <h2 className="text-2xl font-bold mb-2">
          {STATUS_MESSAGES[statusColor as keyof typeof STATUS_MESSAGES]}
        </h2>
        <p className="text-lg opacity-90">Risk Score: {dashboard.score.toFixed(1)}/100</p>
        {dashboard.metrics.recent_symptoms.length > 0 && (
          <p className="text-sm mt-2">Symptoms: {dashboard.metrics.recent_symptoms.join(', ')}</p>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Adherence */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-2">💊 Medication Adherence</h3>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {dashboard.metrics.adherence_pct?.toFixed(0)}%
          </div>
          <div className="w-full bg-gray-200 rounded h-2">
            <div
              className="bg-blue-600 h-2 rounded"
              style={{ width: `${dashboard.metrics.adherence_pct || 0}%` }}
            />
          </div>
        </div>

        {/* BP */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-2">❤️ Blood Pressure</h3>
          <div className="text-3xl font-bold text-red-600 mb-2">
            {dashboard.metrics.avg_bp || 'N/A'}
          </div>
          <p className="text-sm text-gray-600">Trend: {dashboard.metrics.bp_trend}</p>
        </div>

        {/* Glucose */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-2">📊 Glucose</h3>
          <div className="text-3xl font-bold text-amber-600 mb-2">
            {dashboard.metrics.avg_glucose?.toFixed(0) || 'N/A'} mg/dL
          </div>
          <p className="text-sm text-gray-600">Trend: {dashboard.metrics.glucose_trend}</p>
        </div>

        {/* Alerts */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-2">⚠️ This Week</h3>
          <div className="text-3xl font-bold text-orange-600 mb-2">
            {dashboard.metrics.alerts_count}
          </div>
          <p className="text-sm text-gray-600">Alerts to review</p>
        </div>
      </div>

      {/* Recent Alerts */}
      {dashboard.recent_alerts && dashboard.recent_alerts.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">Recent Alerts</h3>
          <div className="space-y-2">
            {dashboard.recent_alerts.slice(0, 5).map((alert: any) => (
              <div
                key={alert.id}
                className={`p-3 rounded ${
                  alert.level === 'red'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-amber-50 border border-amber-200'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-semibold">
                    {alert.level === 'red' ? '🚨' : '⚠️'} {alert.level.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-600">
                    {new Date(alert.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  {alert.reason_codes.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDownloadPDF}
          disabled={reportLoading}
          className="flex-1 bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {reportLoading ? '⏳ Generating...' : '📥 Download PDF'}
        </button>
      </div>
    </div>
  );
}
