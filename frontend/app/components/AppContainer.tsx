'use client';

import { useState } from 'react';
import QuickLog from './QuickLog';
import Dashboard from './Dashboard';
import MedicationManager from './MedicationManager';

interface AppContainerProps {
  userId: string;
}

export default function AppContainer({ userId }: AppContainerProps) {
  const [activeTab, setActiveTab] = useState<'log' | 'dashboard' | 'settings' | 'medications'>('log');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showMedicationModal, setShowMedicationModal] = useState(false);

  const handleEventLogged = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Top Navigation */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-blue-700">🏥 Chronic Health Buddy</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {/* Tabs Navigation */}
        <div className="flex gap-2 p-4 bg-white m-4 rounded-lg shadow border-b flex-wrap">
          <button
            onClick={() => setActiveTab('log')}
            className={`px-4 py-2 rounded font-semibold transition ${
              activeTab === 'log'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📝 Log
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded font-semibold transition ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setShowMedicationModal(true)}
            className="px-4 py-2 rounded font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition"
          >
            💊 My Medications
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded font-semibold transition ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ⚙️ Settings
          </button>
        </div>

        {/* Content Areas */}
        {activeTab === 'log' && <QuickLog userId={userId} onEventLogged={handleEventLogged} />}

        {activeTab === 'dashboard' && (
          <div className="p-4">
            <Dashboard userId={userId} refreshTrigger={refreshTrigger} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4 bg-white rounded-lg shadow m-4">
            <h2 className="text-2xl font-bold mb-4">⚙️ Settings</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded border border-gray-200">
                <p className="text-gray-600">Settings coming soon...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Medication Manager Modal */}
      {showMedicationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full my-8">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">💊 Medication Manager</h2>
              <button
                onClick={() => setShowMedicationModal(false)}
                className="text-2xl text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <MedicationManager 
                userId={userId} 
                onClose={() => setShowMedicationModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
