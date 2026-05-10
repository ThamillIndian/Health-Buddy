'use client';

import { useState } from 'react';
import Header from '@/app/components/Header';
import Dashboard from '@/app/components/Dashboard';
import { useUserId } from '@/app/hooks/useUserId';

export default function DashboardPage() {
  const { userId, loading } = useUserId();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        ) : userId ? (
          <Dashboard userId={userId} refreshTrigger={refreshTrigger} />
        ) : (
          <div className="text-center py-12">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800 font-medium">⚠️ Unable to load user profile</p>
              <p className="text-yellow-600 text-sm mt-2">Please try refreshing the page</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
