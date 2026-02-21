'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/app/components/Sidebar';
import { NotificationService } from '@/app/utils/notificationService';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        router.push('/');
        return;
      }

      try {
        // Verify user with backend
        const response = await fetch(`http://localhost:8000/api/users/${userId}`);
        if (response.ok) {
          setIsAuthenticated(true);

          // Initialize PWA and notifications
          try {
            await NotificationService.initialize(userId);
            console.log('✅ PWA and notifications initialized');
          } catch (error) {
            console.warn('⚠️ Could not initialize PWA:', error);
          }
        } else {
          localStorage.removeItem('userId');
          router.push('/');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('userId');
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Cleanup on unmount
    return () => {
      NotificationService.cleanup();
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading your health data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
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
