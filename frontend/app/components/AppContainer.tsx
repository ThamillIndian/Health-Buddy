'use client';

import { useState } from 'react';
import QuickLog from './QuickLog';
import Dashboard from './Dashboard';

interface AppContainerProps {
  userId: string;
}

export default function AppContainer({ userId }: AppContainerProps) {
  const [activeTab, setActiveTab] = useState<'log' | 'dashboard' | 'settings'>('log');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-700 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold text-center">🏥 Chronic Health Buddy</h1>
        <p className="text-center text-blue-100 text-sm">Your daily health companion</p>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto">
        {activeTab === 'log' && (
          <QuickLog userId={userId} onEventLogged={() => setRefreshTrigger(r => r + 1)} />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard userId={userId} refreshTrigger={refreshTrigger} />
        )}

        {activeTab === 'settings' && (
          <div className="p-4 text-center">
            <p className="text-gray-600">Settings coming soon...</p>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-2xl mx-auto flex justify-around">
          <button
            onClick={() => setActiveTab('log')}
            className={`flex-1 p-4 text-center font-semibold transition ${
              activeTab === 'log'
                ? 'text-blue-600 border-t-4 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📝 Log
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 p-4 text-center font-semibold transition ${
              activeTab === 'dashboard'
                ? 'text-blue-600 border-t-4 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 p-4 text-center font-semibold transition ${
              activeTab === 'settings'
                ? 'text-blue-600 border-t-4 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⚙️ Settings
          </button>
        </div>
      </nav>

      {/* Spacing for bottom nav */}
      <div className="h-20" />
    </div>
  );
}
