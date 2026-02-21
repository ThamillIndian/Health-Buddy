'use client';

import { useState, useEffect } from 'react';
import { useInstallPrompt } from '@/app/hooks/useInstallPrompt';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { isInstallable, isInstalled, install, dismiss } = useInstallPrompt();
  const [showInstallSuccess, setShowInstallSuccess] = useState(false);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowInstallSuccess(true);
      setTimeout(() => setShowInstallSuccess(false), 3000);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="flex items-center justify-between p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {actions}

          {/* Install App Button */}
          {isInstallable && !isInstalled && (
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm"
              title="Install Health Buddy as an app"
            >
              📱 Install App
            </button>
          )}

          {/* Installed Indicator */}
          {isInstalled && (
            <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm font-semibold">
              ✅ App Installed
            </div>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-lg"
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
    </header>
  );
}

