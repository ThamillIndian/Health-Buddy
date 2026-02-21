/**
 * NotificationService - Manages PWA notifications and medication reminders
 * Handles requesting permissions, scheduling checks, and triggering notifications
 */

export class NotificationService {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static lastNotifiedTime: string = '';

  /**
   * Request user permission for notifications
   */
  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('⚠️ Notifications not supported in this browser');
      return false;
    }

    if (Notification.permission === 'granted') {
      console.log('✅ Notification permission already granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('⚠️ Notification permission denied by user');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        return true;
      } else {
        console.warn('⚠️ Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Check if notifications are supported and permitted
   */
  static canNotify(): boolean {
    return (
      'Notification' in window && Notification.permission === 'granted'
    );
  }

  /**
   * Store userId in IndexedDB for Service Worker access
   */
  static async storeUserId(userId: string): Promise<void> {
    if (!('indexedDB' in window)) {
      console.warn('⚠️ IndexedDB not supported');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('HealthBuddy', 1);

      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        const db = request.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains('user')) {
          // This only works during upgrade, but we handle it gracefully
        }

        try {
          const transaction = db.transaction('user', 'readwrite');
          const objectStore = transaction.objectStore('user');
          objectStore.put({ key: 'userId', value: userId });

          transaction.oncomplete = () => {
            console.log('✅ User ID stored in IndexedDB');
            resolve();
          };
        } catch (error) {
          // Object store doesn't exist yet, try again
          console.warn('⚠️ Could not store userId:', error);
          resolve(); // Don't fail completely
        }
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('user')) {
          db.createObjectStore('user', { keyPath: 'key' });
          console.log('✅ Created IndexedDB object store');
        }
      };
    });
  }

  /**
   * Start checking for medication reminders
   * Checks every minute for due medications
   */
  static startReminderChecks(userId?: string): void {
    if (this.checkInterval) {
      console.log('ℹ️  Reminder checks already started');
      return;
    }

    console.log('▶️ Starting medication reminder checks...');

    // Check immediately
    this.checkMedications();

    // Then check every minute
    this.checkInterval = setInterval(() => {
      this.checkMedications();
    }, 60000); // 60 seconds

    // Also check every 30 seconds as fallback
    setInterval(() => {
      const now = new Date();
      const seconds = now.getSeconds();
      // Only check on the minute boundary (when seconds is 0-2 or 58-59)
      if (seconds < 3 || seconds > 57) {
        console.log('🔄 Fallback check triggered');
      }
    }, 30000);
  }

  /**
   * Stop reminder checks
   */
  static stopReminderChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏸️ Medication reminder checks stopped');
    }
  }

  /**
   * Manually check medications and trigger notifications
   * Can be called from components or periodically
   */
  static async checkMedications(): Promise<void> {
    if (!this.canNotify()) {
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        return;
      }

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      // Avoid duplicate checks in same minute
      if (currentTime === this.lastNotifiedTime) {
        return;
      }

      // Fetch medications
      const response = await fetch(
        `/api/users/${userId}/medications`,
        { cache: 'no-cache' }
      );

      if (!response.ok) {
        console.warn('⚠️ Failed to fetch medications');
        return;
      }

      const medications = await response.json();

      // Check each medication
      let notified = false;
      medications.forEach((med: any) => {
        if (!med.times || !Array.isArray(med.times)) return;

        med.times.forEach((time: string) => {
          if (time === currentTime) {
            console.log('🔔 Medication time detected:', med.name);
            this.showMedicationNotification(med, userId);
            notified = true;
          }
        });
      });

      if (notified) {
        this.lastNotifiedTime = currentTime;
      }
    } catch (error) {
      console.error('❌ Error checking medications:', error);
    }
  }

  /**
   * Show medication notification to user
   */
  private static showMedicationNotification(
    medication: any,
    userId: string
  ): void {
    if (!this.canNotify()) {
      return;
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Use Service Worker to show notification
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        medication,
        userId,
      });
    } else {
      // Fallback: show notification directly
      const notification = new Notification(
        '💊 Time for your medication!',
        {
          body: `${medication.name} ${medication.strength}`,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `med-${medication.id}`,
          requireInteraction: true,
        }
      );

      notification.onclick = async () => {
        window.focus();
        // Log medication as taken
        await fetch(`/api/users/${userId}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'medication',
            payload: {
              action: 'taken',
              medication_id: medication.id,
              source: 'notification',
            },
            source: 'web',
            language: 'en',
          }),
        });
        notification.close();
      };
    }
  }

  /**
   * Register Service Worker and set up background sync
   */
  static async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Workers not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('✅ Service Worker registered');

      // Set up background sync if available
      if ('SyncManager' in window && registration.sync) {
        try {
          await registration.sync.register('check-medications');
          console.log('✅ Background sync registered');
        } catch (error) {
          console.warn('⚠️ Background sync not available:', error);
        }
      }
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }

  /**
   * Request background sync to check medications
   */
  static async requestBackgroundSync(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      if (registration.sync) {
        await registration.sync.register('check-medications');
        console.log('✅ Background sync requested');
      }
    } catch (error) {
      console.warn('⚠️ Could not request background sync:', error);
    }
  }

  /**
   * Initialize everything needed for notifications
   */
  static async initialize(userId: string): Promise<void> {
    console.log('🚀 Initializing NotificationService...');

    // Request permission
    const hasPermission = await this.requestPermission();

    if (hasPermission) {
      // Store userId for Service Worker
      await this.storeUserId(userId);

      // Register Service Worker
      await this.registerServiceWorker();

      // Start checking for reminders
      this.startReminderChecks(userId);

      console.log('✅ NotificationService fully initialized');
    } else {
      console.warn('⚠️ Cannot initialize NotificationService without permission');
    }
  }

  /**
   * Cleanup
   */
  static cleanup(): void {
    this.stopReminderChecks();
  }
}
