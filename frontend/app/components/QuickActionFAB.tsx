'use client';

import { useState } from 'react';
import QuickLog from './QuickLog';
import VoiceInput from './VoiceInput';

interface QuickActionFABProps {
  userId: string;
  onDataLogged?: () => void;
}

export default function QuickActionFAB({ userId, onDataLogged }: QuickActionFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const actions = [
    { id: 'log-vital', icon: '📊', label: 'Log Vital', color: 'bg-blue-500' },
    { id: 'voice-input', icon: '🎤', label: 'Voice', color: 'bg-purple-500' },
    { id: 'trends', icon: '📈', label: 'Trends', color: 'bg-green-500' },
  ];

  const handleActionClick = (actionId: string) => {
    setActiveAction(actionId);
  };

  const handleClose = () => {
    setIsOpen(false);
    setActiveAction(null);
  };

  return (
    <>
      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-lg transition-all transform hover:scale-110 z-40 ${
          isOpen ? 'bg-red-500 rotate-45' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        <div className={`text-2xl transition-transform ${isOpen ? 'rotate-45' : ''}`}>
          {isOpen ? '✕' : '➕'}
        </div>
      </button>

      {/* Action Menu */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 flex flex-col gap-3 z-40">
          {actions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action.id)}
              className={`${action.color} text-white p-3 rounded-full shadow-lg transition-all transform hover:scale-110 flex items-center gap-2 whitespace-nowrap`}
              style={{
                animation: `slideIn 0.3s ease-out ${index * 0.1}s backwards`,
              }}
            >
              <span className="text-xl">{action.icon}</span>
              <span className="text-sm font-semibold">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30"
          onClick={handleClose}
        />
      )}

      {/* Modal for Actions */}
      {activeAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">
                {activeAction === 'log-vital' && '📊 Log Vital Sign'}
                {activeAction === 'voice-input' && '🎤 Voice Input'}
                {activeAction === 'trends' && '📈 View Trends'}
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              {activeAction === 'log-vital' && (
                <div>
                  <QuickLog
                    userId={userId}
                    onEventLogged={() => {
                      onDataLogged?.();
                      handleClose();
                    }}
                  />
                </div>
              )}

              {activeAction === 'voice-input' && (
                <div>
                  <VoiceInput
                    userId={userId}
                    onSuccess={() => {
                      onDataLogged?.();
                      handleClose();
                    }}
                  />
                </div>
              )}

              {activeAction === 'trends' && (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">📈 View trends on the main dashboard</p>
                  <button
                    onClick={handleClose}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
