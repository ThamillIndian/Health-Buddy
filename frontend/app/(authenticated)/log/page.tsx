'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import QuickLog from '@/app/components/QuickLog';

export default function LogPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('userId');
    if (id) {
      setUserId(id);
    }
  }, []);

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

      <div className="p-6">
        {userId ? (
          <div className="max-w-2xl">
            <QuickLog userId={userId} onEventLogged={handleEventLogged} />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        )}
      </div>
    </div>
  );
}
