'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import { NotificationService } from '@/app/utils/notificationService';
import { useAuth } from '@/app/contexts/AuthContext';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [notificationsInit, setNotificationsInit] = useState(false);

  useEffect(() => {
    // Redirect to signin if not authenticated
    if (!loading && !user) {
      router.push('/signin');
    }

    // Initialize notifications when user is authenticated
    if (user && !notificationsInit) {
      const initNotifications = async () => {
        try {
          await NotificationService.initialize(user.id);
          console.log('✅ PWA and notifications initialized');
          setNotificationsInit(true);
        } catch (error) {
          console.warn('⚠️ Could not initialize PWA:', error);
        }
      };

      initNotifications();
    }

    // Cleanup on unmount
    return () => {
      if (notificationsInit) {
        NotificationService.cleanup();
      }
    };
  }, [user, loading, router, notificationsInit]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading your health data...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="md:ml-64">
        {children}
      </main>
    </div>
  );
}
