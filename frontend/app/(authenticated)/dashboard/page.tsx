'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import Dashboard from '@/app/components/Dashboard';
import { apiClient } from '@/app/utils/api';

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const id = localStorage.getItem('userId');
    if (id) {
      setUserId(id);
    }
  }, []);

  return (
    <div>
      <Header
        title="Health Dashboard"
        subtitle="Your daily health overview"
        actions={
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            🔄 Refresh
          </button>
        }
      />

      <div className="p-6">
        {userId ? (
          <Dashboard userId={userId} refreshTrigger={refreshTrigger} />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        )}
      </div>
    </div>
  );
}
