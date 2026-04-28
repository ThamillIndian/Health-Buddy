'use client';

import { useEffect } from 'react';
import { CRITICAL_SYMPTOM_RECOMMENDATIONS } from '@/app/utils/constants';

interface CriticalSymptomAlertProps {
  symptomName: string;
  severity: number;
  onDismiss: () => void;
  onCallEmergency?: () => void;
}

export default function CriticalSymptomAlert({
  symptomName,
  severity,
  onDismiss,
  onCallEmergency,
}: CriticalSymptomAlertProps) {
  const recommendation = CRITICAL_SYMPTOM_RECOMMENDATIONS[symptomName] || 
    "This symptom requires immediate medical attention. Please seek help from a healthcare professional or emergency services.";

  // Trigger browser notification if permission granted
  useEffect(() => {
    const showNotification = async () => {
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        
        if (Notification.permission === 'granted') {
          new Notification(`🚨 Critical Symptom: ${symptomName}`, {
            body: 'Immediate medical attention required',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `critical-symptom-${symptomName}`,
            requireInteraction: true
          });
        }
      }
    };
    
    showNotification();
  }, [symptomName]);

  const handleCallEmergency = () => {
    // Open phone dialer with emergency number (108 for India, 911 for US)
    window.location.href = 'tel:108';
    if (onCallEmergency) {
      onCallEmergency();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border-4 border-red-500">
        {/* Header */}
        <div className="bg-red-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🚨</span>
            <div>
              <h2 className="text-2xl font-bold">Critical Symptom Detected</h2>
              <p className="text-red-100 text-sm mt-1">Immediate attention required</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🫀</span>
              <h3 className="text-xl font-bold text-gray-800">{symptomName}</h3>
            </div>
            <p className="text-gray-600">
              <span className="font-semibold">Severity:</span> {severity}/3 (High)
            </p>
          </div>

          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
            <p className="text-gray-800 text-sm leading-relaxed">{recommendation}</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleCallEmergency}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span>📞</span>
              <span>Call Emergency Services (108)</span>
            </button>

            <button
              onClick={() => {
                // Open recommendations or doctor contact
                window.open('https://www.google.com/search?q=emergency+medical+services', '_blank');
              }}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <span>📋</span>
              <span>View Medical Resources</span>
            </button>

            <button
              onClick={onDismiss}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-all"
            >
              I Understand - Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
