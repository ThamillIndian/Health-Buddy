'use client';

import { useState, useEffect } from 'react';
import { useInstallPrompt } from '@/app/hooks/useInstallPrompt';
import { useNotifications } from '@/app/hooks/useNotifications';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { isInstallable, isInstalled, install, dismiss } = useInstallPrompt();
  const [showInstallSuccess, setShowInstallSuccess] = useState(false);
  
  const { 
    permission, 
    isSupported, 
    isLoading, 
    requestPermission, 
    isEnabled,
    showToast,
    toastMessage 
  } = useNotifications();
  const [showBellMenu, setShowBellMenu] = useState(false);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowInstallSuccess(true);
      setTimeout(() => setShowInstallSuccess(false), 3000);
    }
  };

  const handleBellClick = () => {
    if (isEnabled) {
      setShowBellMenu(!showBellMenu);
    } else {
      requestPermission();
    }
  };

  return (
    <header className="bg-white border-b-2 border-gray-200 shadow-md sticky top-0 z-30 backdrop-blur-sm bg-white/95">
      <div className="flex items-center justify-between p-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1.5 font-medium">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {actions}

          {/* Notification Bell */}
          {isSupported && (
            <div className="relative">
              <button
                onClick={handleBellClick}
                disabled={isLoading}
                className={`p-3 rounded-xl transition-all duration-200 text-xl relative transform hover:scale-110 ${
                  isEnabled
                    ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 text-yellow-600 shadow-md'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                title={
                  isEnabled
                    ? 'Notifications enabled - Click to view options'
                    : 'Click to enable notifications'
                }
              >
                🔔
                {isEnabled && (
                  <span className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse ring-2 ring-white"></span>
                )}
              </button>

              {/* Bell Menu */}
              {isEnabled && showBellMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">✅</span>
                      <div>
                        <p className="font-semibold text-gray-900">Notifications Enabled</p>
                        <p className="text-xs text-gray-600">You will receive medication reminders</p>
                      </div>
                    </div>
                    <hr className="my-2" />
                    <button
                      onClick={() => {
                        const userId = localStorage.getItem('userId');
                        if (userId && 'serviceWorker' in navigator) {
                          navigator.serviceWorker.ready.then(reg => {
                            reg.showNotification('💊 Time for your medication!', {
                              body: 'This is a test notification. You will see this when it\'s time to take your medications.',
                              icon: '/icon-192x192.png',
                              badge: '/icon-192x192.png',
                              tag: 'test-med-reminder',
                              requireInteraction: true,
                              actions: [
                                { action: 'taken', title: '✅ Taken' },
                                { action: 'snooze', title: '⏰ Snooze' },
                              ],
                            });
                          });
                        }
                        setShowBellMenu(false);
                      }}
                      className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-sm font-semibold transition"
                    >
                      🧪 Send Test Reminder
                    </button>
                    <button
                      onClick={() => setShowBellMenu(false)}
                      className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-semibold transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* Permission Denied Message */}
              {!isEnabled && permission === 'denied' && (
                <div className="absolute right-0 mt-2 w-72 bg-red-50 rounded-lg shadow-xl border border-red-200 z-50 p-4">
                  <p className="text-sm text-red-700 font-semibold">
                    ❌ Notification permission denied. Please enable notifications in your browser settings to receive medication reminders.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Install App Button */}
          {isInstallable && !isInstalled && (
            <button
              onClick={handleInstall}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 font-bold text-sm shadow-md hover:shadow-lg"
              title="Install Health Buddy as an app"
            >
              📱 Install App
            </button>
          )}

          {/* Installed Indicator */}
          {isInstalled && (
            <div className="px-4 py-2.5 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-xl border-2 border-green-200 text-sm font-bold shadow-sm">
              ✅ App Installed
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all duration-200 transform hover:scale-110 text-lg shadow-sm"
            title="Toggle dark mode"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Install Success Message */}
      {showInstallSuccess && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-3 text-green-700 font-semibold animate-pulse">
          ✅ App installed successfully! You can now access it from your home screen.
        </div>
      )}

      {/* Notification Toast */}
      {showToast && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 text-blue-700 font-semibold animate-pulse">
          {toastMessage}
        </div>
      )}
    </header>
  );
}

