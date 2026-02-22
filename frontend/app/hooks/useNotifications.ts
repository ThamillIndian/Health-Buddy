'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to manage notifications
 * Checks permission status, requests permission, and provides visual feedback
 * Now includes enable/disable toggle functionality
 */
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true); // User preference

  // Start reminder checks in service worker
  const startReminderChecks = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const userId = localStorage.getItem('userId');
      if (userId) {
        navigator.serviceWorker.controller.postMessage({
          type: 'START_REMINDER_CHECKS',
          userId: userId,
        });
        console.log('✅ Started reminder checks');
      }
    }
  };

  // Stop reminder checks in service worker
  const stopReminderChecks = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'STOP_REMINDER_CHECKS',
      });
      console.log('⏸️ Stopped reminder checks');
    }
  };

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

    // Load user's notification preference from localStorage
    const savedPreference = localStorage.getItem('notificationsEnabled');
    if (savedPreference !== null) {
      const enabled = JSON.parse(savedPreference);
      setNotificationsEnabled(enabled);
      
      // If enabled and permission granted, start reminder checks
      if (enabled && Notification.permission === 'granted') {
        startReminderChecks();
      } else {
        stopReminderChecks();
      }
    } else {
      // Default: enabled if permission is granted
      if (Notification.permission === 'granted') {
        startReminderChecks();
      }
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      showNotificationToast('❌ Notifications not supported in this browser');
      return false;
    }

    if (permission === 'granted') {
      showNotificationToast('✅ Notifications already enabled!');
      // Start reminder checks if user preference is enabled
      if (notificationsEnabled) {
        startReminderChecks();
      }
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
        
        // Start reminder checks if user preference is enabled
        if (notificationsEnabled) {
          startReminderChecks();
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

  // Toggle notifications on/off
  const toggleNotifications = async () => {
    if (permission !== 'granted') {
      // If permission not granted, request it first
      const granted = await requestPermission();
      if (!granted) {
        return; // User denied permission
      }
    }

    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    localStorage.setItem('notificationsEnabled', JSON.stringify(newState));

    if (newState) {
      startReminderChecks();
      showNotificationToast('✅ Notifications enabled! You will receive medication reminders.');
    } else {
      stopReminderChecks();
      showNotificationToast('⏸️ Notifications disabled. You will not receive medication reminders.');
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
    notificationsEnabled, // User's toggle preference
    toggleNotifications, // Toggle function
  };
}
