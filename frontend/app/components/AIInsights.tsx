'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/app/utils/api';

interface InsightsProps {
  userId: string;
}

export default function AIInsights({ userId }: InsightsProps) {
  const [dailyTip, setDailyTip] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const hasLoadedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let intervalId: NodeJS.Timeout | null = null;
    let isFetching = false; // Prevent concurrent fetches

    const fetchInsights = async () => {
      // Prevent concurrent fetches
      if (isFetching || !mountedRef.current) return;
      
      isFetching = true;

      try {
        const isInitialLoad = !hasLoadedRef.current;
        if (isInitialLoad) {
          setLoading(true);
        }
        
        // Fetch daily tip from AI endpoint with timeout
        try {
          const tipPromise = api.get(`/users/${userId}/insights/daily-tip`);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 8000)
          );

          const tipRes = await Promise.race([tipPromise, timeoutPromise]) as any;

          if (mountedRef.current && tipRes?.data?.tip) {
            setDailyTip(tipRes.data.tip);
          } else if (mountedRef.current && isInitialLoad) {
            setDailyTip('💡 Stay consistent with your medications!');
          }
        } catch (e: any) {
          if (mountedRef.current && isInitialLoad) {
            console.warn('Tip fetch error:', e.message || e);
            setDailyTip('💡 Stay consistent with your medications!');
          }
        }

        // Fetch doctor summary from AI endpoint with timeout
        try {
          const summaryPromise = api.get(`/users/${userId}/insights/doctor-summary`, { 
            params: { days: 7 } 
          });
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 8000)
          );

          const summaryRes = await Promise.race([summaryPromise, timeoutPromise]) as any;

          if (mountedRef.current && summaryRes?.data?.summary) {
            setSummary(summaryRes.data.summary);
          } else if (mountedRef.current && isInitialLoad) {
            setSummary('📋 Keep tracking your health consistently.');
          }
        } catch (e: any) {
          if (mountedRef.current && isInitialLoad) {
            console.warn('Summary fetch error:', e.message || e);
            setSummary('📋 Keep tracking your health consistently.');
          }
        }

        if (mountedRef.current) {
          setError('');
          hasLoadedRef.current = true;
          setLoading(false);
        }
      } catch (err: any) {
        if (mountedRef.current) {
          setError('');
          setLoading(false);
          console.warn('Insights error:', err.message || err);
        }
      } finally {
        isFetching = false;
      }
    };

    if (userId) {
      // Initial fetch
      fetchInsights();
      
      // Set up interval for periodic refresh (only after initial load)
      // Use a ref-based approach to avoid dependency issues
      const setupInterval = () => {
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(() => {
          if (mountedRef.current && hasLoadedRef.current) {
            fetchInsights();
          }
        }, 15 * 60 * 1000); // 15 minutes
      };
      
      // Setup interval after a short delay to ensure initial load completes
      const timeoutId = setTimeout(setupInterval, 2000);
      
      return () => {
        mountedRef.current = false;
        if (intervalId) clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }

    return () => {
      mountedRef.current = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [userId]); // Only depend on userId, use refs for hasLoaded

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
