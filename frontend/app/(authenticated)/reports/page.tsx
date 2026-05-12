'use client';

import { useState, useEffect } from 'react';
import Header from '@/app/components/Header';
import { useUserId } from '@/app/hooks/useUserId';
import api from '@/app/utils/api';
import { DEMO_MODE, mockDashboardData, mockMedications, mockHealthEvents } from '@/app/lib/mockData';

export default function ReportsPage() {
  const { userId, loading: userLoading } = useUserId();
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadSummary();
    }
  }, [userId, selectedPeriod]);

  const loadSummary = async () => {
    if (DEMO_MODE) {
      // Use mock data in demo mode
      setLoading(true);
      setTimeout(() => {
        setSummary({
          period_days: selectedPeriod,
          metrics: {
            adherence_pct: mockDashboardData.adherence.rate,
            symptoms_count: mockHealthEvents.filter((e: any) => e.type === 'symptom').length,
            risk_level: 'green',
            alerts_count: 0
          },
          summary: `📋 **Patient Health Summary (${selectedPeriod}-Day Period)**\n\n**Medication Adherence:** Excellent compliance with 87.5% adherence rate.\n\n**Vital Signs:** Blood pressure improving, glucose stable, weight maintained.\n\n**Overall Status:** GREEN - Patient responding well to treatment.`
        });
        setLoading(false);
      }, 300);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/users/${userId}/insights/doctor-summary`, {
        params: { days: selectedPeriod }
      });
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedicationStats = () => {
    const totalMeds = mockMedications.length;
    const activeMeds = mockMedications.filter((m: any) => m.active).length;
    return { totalMeds, activeMeds };
  };

  const getVitalStats = () => {
    const vitalEvents = mockHealthEvents.filter((e: any) => e.type === 'vital');
    const latestBP = vitalEvents.reverse().find((e: any) => e.payload.bp);
    const latestGlucose = vitalEvents.find((e: any) => e.payload.glucose);
    const latestWeight = vitalEvents.find((e: any) => e.payload.weight);
    
    return {
      bp: latestBP?.payload.bp || 'N/A',
      glucose: latestGlucose?.payload.glucose || 'N/A',
      weight: latestWeight?.payload.weight || 'N/A'
    };
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const medStats = getMedicationStats();
  const vitalStats = getVitalStats();

  return (
    <div>
      <Header
        title="Health Reports"
        subtitle="Comprehensive health summaries and analytics"
      />

      <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 min-h-screen">
        {/* Period Selector */}
        <div className="mb-6 flex gap-3">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedPeriod(days as 7 | 30 | 90)}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 transform hover:scale-105 ${
                selectedPeriod === days
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200 shadow-md'
              }`}
            >
              Last {days} Days
            </button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Adherence Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-xl border-2 border-green-200 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">💊</span>
              <h3 className="font-bold text-gray-700">Adherence Rate</h3>
            </div>
            <p className="text-4xl font-bold text-green-700">{mockDashboardData.adherence.rate}%</p>
            <p className="text-sm text-gray-600 mt-2">{medStats.activeMeds} of {medStats.totalMeds} medications active</p>
          </div>

          {/* Blood Pressure Card */}
          <div className="bg-gradient-to-br from-red-50 to-rose-100 p-6 rounded-xl border-2 border-red-200 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">❤️</span>
              <h3 className="font-bold text-gray-700">Blood Pressure</h3>
            </div>
            <p className="text-4xl font-bold text-red-700">{vitalStats.bp}</p>
            <p className="text-sm text-gray-600 mt-2">mmHg (Latest)</p>
          </div>

          {/* Glucose Card */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-100 p-6 rounded-xl border-2 border-amber-200 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🩸</span>
              <h3 className="font-bold text-gray-700">Blood Glucose</h3>
            </div>
            <p className="text-4xl font-bold text-amber-700">{vitalStats.glucose}</p>
            <p className="text-sm text-gray-600 mt-2">mg/dL (Latest)</p>
          </div>
        </div>

        {/* AI-Generated Summary */}
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🤖</span>
            <h2 className="text-2xl font-bold text-gray-800">AI Health Summary</h2>
          </div>

          {loading ? (
            <div className="flex items-center gap-3 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Generating comprehensive health report...</p>
            </div>
          ) : summary ? (
            <div className="prose max-w-none">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                <pre className="whitespace-pre-wrap font-sans text-gray-800 text-sm leading-relaxed">
                  {summary.summary}
                </pre>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Adherence</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.metrics.adherence_pct}%</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Symptoms</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.metrics.symptoms_count}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Risk Level</p>
                  <p className={`text-2xl font-bold uppercase ${
                    summary.metrics.risk_level === 'green' ? 'text-green-600' :
                    summary.metrics.risk_level === 'amber' ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {summary.metrics.risk_level}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Alerts</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.metrics.alerts_count}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 py-4">No summary data available</p>
          )}
        </div>

        {/* Download Section */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">📄 Export Report</h3>
              <p className="text-gray-600">Download your health summary as a PDF for your doctor</p>
            </div>
            <button
              onClick={() => alert('PDF export feature coming soon!')}
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl font-bold hover:from-purple-700 hover:to-purple-800 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Download PDF
            </button>
          </div>
        </div>

        {/* Chart Section */}
        <div className="mt-6 bg-white rounded-xl border-2 border-gray-200 shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📊</span>
            <h2 className="text-2xl font-bold text-gray-800">Trends & Analytics</h2>
          </div>
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">📈 Detailed charts and graphs</p>
            <p className="text-sm">Visual trends for blood pressure, glucose, weight, and medication adherence</p>
            <p className="text-xs mt-4 text-gray-400">(Charts will be displayed here in full version)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
