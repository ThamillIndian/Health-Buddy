'use client';

import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import QuickLog from '@/app/components/QuickLog';
import { useUserId } from '@/app/hooks/useUserId';

export default function LogPage() {
  const router = useRouter();
  const { userId, loading } = useUserId();

  const handleEventLogged = () => {
    // Refresh dashboard after logging
    router.refresh();
  };

  return (
    <div>
      <Header
        title="Quick Log"
        subtitle="Log your vitals, medications, and symptoms"
      />

      <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 min-h-screen">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4 font-medium">Loading...</p>
          </div>
        ) : userId ? (
          <div className="max-w-3xl mx-auto">
            <QuickLog userId={userId} onEventLogged={handleEventLogged} />
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 inline-block">
              <p className="text-yellow-800 font-medium">⚠️ Unable to load profile</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
