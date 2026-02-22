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
    toastMessage,
    notificationsEnabled,
    toggleNotifications,
    sendTestNotification
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
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-50 p-5">
                  <div className="space-y-4">
                    {/* Status Header */}
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
                      <div className={`p-2 rounded-lg ${notificationsEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <span className="text-2xl">{notificationsEnabled ? '✅' : '⏸️'}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900">
                          {notificationsEnabled ? 'Notifications Enabled' : 'Notifications Disabled'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {notificationsEnabled 
                            ? 'You will receive medication reminders' 
                            : 'Medication reminders are paused'}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">Enable Notifications</p>
                        <p className="text-xs text-gray-600">Toggle medication reminders on/off</p>
                      </div>
                      <button
                        onClick={toggleNotifications}
                        disabled={isLoading}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          notificationsEnabled
                            ? 'bg-gradient-to-r from-green-500 to-green-600'
                            : 'bg-gray-300'
                        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        role="switch"
                        aria-checked={notificationsEnabled}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 shadow-md ${
                            notificationsEnabled ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <hr className="my-2" />

                    {/* Test Notification Button */}
                    <button
                      onClick={() => {
                        sendTestNotification();
                        setShowBellMenu(false);
                      }}
                      disabled={!notificationsEnabled || isLoading}
                      className={`w-full px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 transform hover:scale-105 ${
                        notificationsEnabled
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      🧪 Send Test Reminder
                    </button>

                    {/* Close Button */}
                    <button
                      onClick={() => setShowBellMenu(false)}
                      className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition"
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

