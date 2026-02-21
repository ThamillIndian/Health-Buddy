'use client';

import { useState, useEffect } from 'react';
import Header from '@/app/components/Header';
import { apiClient } from '@/app/utils/api';
import { MEDICATIONS } from '@/app/utils/constants';

interface HealthEvent {
  id: string;
  timestamp: string;
  type: string;
  payload: any;
}

export default function HealthRecordsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'vital' | 'medication' | 'symptom'>('all');

  useEffect(() => {
    const id = localStorage.getItem('userId');
    if (id) {
      setUserId(id);
      loadEvents(id);
    }
  }, []);

  const loadEvents = async (id: string) => {
    try {
      setLoading(true);
      const response = await apiClient.getEvents(id, 30);
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'vital':
        return '📊';
      case 'medication':
        return '💊';
      case 'symptom':
        return '😷';
      default:
        return '📝';
    }
  };

  return (
    <div>
      <Header
        title="Health Records"
        subtitle="Your health history and timeline"
      />

      <div className="p-6">
        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {(['all', 'vital', 'medication', 'symptom'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No health records found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{getEventIcon(event.type)}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg capitalize">
                        {event.type}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {formatDate(event.timestamp)}
                      </span>
                    </div>
                    <div className="text-gray-700">
                      {event.type === 'vital' && (
                        <div className="space-y-1">
                          {event.payload.bp && (
                            <p>BP: <span className="font-medium">{event.payload.bp} mmHg</span></p>
                          )}
                          {event.payload.glucose && (
                            <p>Glucose: <span className="font-medium">{event.payload.glucose} mg/dL</span></p>
                          )}
                          {event.payload.weight && (
                            <p>Weight: <span className="font-medium">{event.payload.weight} kg</span></p>
                          )}
                        </div>
                      )}
                      {event.type === 'medication' && (
                        <div>
                          <p>
                            <span className="font-medium capitalize">{event.payload.action || 'Action'}</span>
                            {(() => {
                              // First try to use medication_name from payload
                              let medName = event.payload.medication_name;
                              let medStrength = event.payload.medication_strength;
                              
                              // If name is missing, try to find it from MEDICATIONS constant
                              if (!medName && event.payload.medication_id) {
                                const foundMed = MEDICATIONS.find(m => m.id === event.payload.medication_id);
                                if (foundMed) {
                                  // Extract name and strength from library entry
                                  const nameParts = foundMed.name.split(' ');
                                  if (nameParts.length > 1) {
                                    const lastPart = nameParts[nameParts.length - 1];
                                    if (lastPart.match(/\d+(mg|mcg|IU)/i)) {
                                      medStrength = lastPart;
                                      medName = nameParts.slice(0, -1).join(' ');
                                    } else {
                                      medName = foundMed.name;
                                    }
                                  } else {
                                    medName = foundMed.name;
                                  }
                                } else {
                                  // Extract readable name from ID (e.g., "glibenclamide_5" -> "Glibenclamide")
                                  const parts = event.payload.medication_id.split('_');
                                  if (parts.length > 0) {
                                    medName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
                                    if (parts.length > 1 && !medStrength) {
                                      const strengthPart = parts[1];
                                      if (strengthPart.match(/^\d+$/)) {
                                        medStrength = strengthPart + 'mg';
                                      }
                                    }
                                  } else {
                                    medName = event.payload.medication_id;
                                  }
                                }
                              }
                              
                              // Display the medication name (no "Medication ID" prefix)
                              if (medName) {
                                return (
                                  <span>: <span className="font-semibold text-blue-700">{medName}</span> {medStrength && <span className="text-gray-600">({medStrength})</span>}</span>
                                );
                              } else {
                                return <span>: Unknown Medication</span>;
                              }
                            })()}
                          </p>
                        </div>
                      )}
                      {event.type === 'symptom' && (
                        <p>
                          <span className="font-medium">{event.payload.name}</span> (Severity: {event.payload.severity}/3)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
