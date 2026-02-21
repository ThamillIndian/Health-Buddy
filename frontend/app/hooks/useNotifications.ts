'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to manage notifications
 * Checks permission status, requests permission, and provides visual feedback
 */
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Check notification support and current permission
  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      console.log('🔔 Notifications supported, current permission:', Notification.permission);
    } else {
      console.warn('⚠️ Notifications not supported in this browser');
      setIsSupported(false);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      showNotificationToast('❌ Notifications not supported in this browser');
      return false;
    }

    if (permission === 'granted') {
      showNotificationToast('✅ Notifications already enabled!');
      // Send test notification
      sendTestNotification();
      return true;
    }

    if (permission === 'denied') {
      showNotificationToast('❌ Notification permission denied. Please enable in browser settings.');
      return false;
    }

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        showNotificationToast('✅ Notifications enabled! You will now receive medication reminders.');
        
        // Start the Service Worker reminder checks
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          const userId = localStorage.getItem('userId');
          if (userId) {
            navigator.serviceWorker.controller.postMessage({
              type: 'START_REMINDER_CHECKS',
              userId: userId,
            });
            console.log('✅ Service Worker reminder checks started');
          }
        }

        // Send test notification
        setTimeout(() => sendTestNotification(), 500);
        return true;
      } else if (result === 'denied') {
        showNotificationToast('❌ Notification permission denied.');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      showNotificationToast('❌ Error requesting notification permission');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!isSupported || permission !== 'granted') {
      console.warn('⚠️ Cannot send test notification: permission not granted');
      return;
    }

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification('🧪 Test Notification from Health Buddy', {
          body: 'This is a test notification. Medication reminders will appear like this!',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'test-notification',
          requireInteraction: false,
        });
        console.log('✅ Test notification sent');
      }
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
    }
  };

  const showNotificationToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return {
    permission,
    isSupported,
    isLoading,
    requestPermission,
    sendTestNotification,
    showToast,
    toastMessage,
    isEnabled: permission === 'granted',
  };
}
