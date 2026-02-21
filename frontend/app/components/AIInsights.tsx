'use client';

import { useEffect, useState } from 'react';

interface InsightsProps {
  userId: string;
}

export default function AIInsights({ userId }: InsightsProps) {
  const [dailyTip, setDailyTip] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        
        // Fetch daily tip from AI endpoint
        try {
          const tipRes = await fetch(`http://localhost:8000/api/users/${userId}/insights/daily-tip`);
          if (tipRes.ok) {
            const tipData = await tipRes.json();
            setDailyTip(tipData.tip || '💡 Stay consistent with your medications!');
          } else {
            setDailyTip('💡 Stay consistent with your medications!');
          }
        } catch (e) {
          console.error('Tip fetch error:', e);
          setDailyTip('💡 Stay consistent with your medications!');
        }

        // Fetch doctor summary from AI endpoint
        try {
          const summaryRes = await fetch(`http://localhost:8000/api/users/${userId}/insights/doctor-summary?days=7`);
          if (summaryRes.ok) {
            const summaryData = await summaryRes.json();
            setSummary(summaryData.summary || '📋 Keep tracking your health consistently.');
          } else {
            setSummary('📋 Keep tracking your health consistently.');
          }
        } catch (e) {
          console.error('Summary fetch error:', e);
          setSummary('📋 Keep tracking your health consistently.');
        }

        setError('');
      } catch (err) {
        setError('Failed to load insights');
        console.error('Insights error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchInsights();
      // Refresh every 5 minutes
      const interval = setInterval(fetchInsights, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 text-sm">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Daily Tip */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm font-semibold text-gray-700 mb-2">✨ Today's Health Tip</p>
        <p className="text-gray-800">{dailyTip}</p>
      </div>

      {/* Doctor Summary */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
        <p className="text-sm font-semibold text-gray-700 mb-2">📋 Health Summary</p>
        <p className="text-gray-800">{summary}</p>
      </div>
    </div>
  );
}
