import { useState, useEffect } from 'react';
import { apiClient } from '@/app/utils/api';

export function useHealthData(userId: string) {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getDashboard(userId, 7);
        setDashboard(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();

    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  return { dashboard, loading, error };
}
