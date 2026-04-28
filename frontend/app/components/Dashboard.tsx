'use client';

import { useHealthData } from '@/app/hooks/useHealthData';
import { STATUS_COLORS, STATUS_MESSAGES, CRITICAL_SYMPTOMS, CRITICAL_SYMPTOM_RECOMMENDATIONS } from '@/app/utils/constants';
import { useState, useEffect } from 'react';
import TriageComponent from './TriageComponent';
import AIInsights from './AIInsights';
import TrendsChart from './TrendsChart';
import AchievementBadges from './AchievementBadges';
import QuickActionFAB from './QuickActionFAB';
import { apiClient } from '@/app/utils/api';

interface DashboardProps {
  userId: string;
  refreshTrigger?: number;
}

export default function Dashboard({ userId, refreshTrigger }: DashboardProps) {
  const { dashboard, loading, error } = useHealthData(userId);
  const [darkMode, setDarkMode] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved) setDarkMode(JSON.parse(saved));
  }, []);

  useEffect(() => {
    setRefreshKey(k => k + 1);
  }, [refreshTrigger]);

  useEffect(() => {
    const checkCriticalSymptoms = async () => {
      if (!dashboard) return;

      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      try {
        const eventsResponse = await apiClient.getEvents(userId, 1);
        const events = eventsResponse.data;

        const critical = events.filter((event: any) => {
          if (event.type === 'symptom') {
            const symptomName = event.payload?.name || '';
            const severity = event.payload?.severity || 0;
            return CRITICAL_SYMPTOMS.includes(symptomName) && severity >= 3;
          }
          return false;
        });

        setCriticalAlerts(critical);

        if (critical.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
          critical.forEach((event: any) => {
            const notificationTag = `critical-${event.id}`;

            new Notification(`🚨 Critical: ${event.payload.name}`, {
              body: 'Immediate medical attention required',
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: notificationTag,
              requireInteraction: true,
            });

            // ✅ Correct vibration usage
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]);
            }
          });
        }
      } catch (error) {
        console.error('Failed to check critical symptoms:', error);
      }
    };

    checkCriticalSymptoms();
  }, [dashboard, userId]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!dashboard) return <div>No data</div>;

  const statusColor =
    dashboard.status === 'green'
      ? 'green'
      : dashboard.status === 'amber'
      ? 'amber'
      : 'red';

  const statusBg = STATUS_COLORS[statusColor as keyof typeof STATUS_COLORS];

  return (
    <div className={`${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'} min-h-screen`}>
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

        {/* Critical Alert Banner */}
        {criticalAlerts.length > 0 && (
          <div className="bg-red-600 text-white p-4 rounded mb-4">
            🚨 Critical symptoms detected
          </div>
        )}

        <div className={`${statusBg} text-white p-4 rounded mb-4`}>
          {STATUS_MESSAGES[statusColor as keyof typeof STATUS_MESSAGES]}
        </div>

        <TrendsChart key={refreshKey} userId={userId} days={7} />
        <AchievementBadges
          adherence={dashboard.metrics.adherence_pct || 0}
          daysLogged={dashboard.metrics.days_logged || 0}
          alertsFree={statusColor === 'green'}
          streak={dashboard.metrics.consecutive_streak || 0}
        />

        <TriageComponent userId={userId} />
        <AIInsights userId={userId} />
        <QuickActionFAB userId={userId} onDataLogged={() => setRefreshKey(k => k + 1)} />
      </div>
    </div>
  );
}