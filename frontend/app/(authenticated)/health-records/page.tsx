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

interface MissedMedication {
  id: string;
  medication_id: string;
  medication_name: string;
  medication_strength: string;
  scheduled_time: string;
  status: string;
  notes?: string;
}

export default function HealthRecordsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [missedMeds, setMissedMeds] = useState<MissedMedication[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingTaken, setMarkingTaken] = useState<string | null>(null); // Track which medication is being marked
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [markedAsTakenIds, setMarkedAsTakenIds] = useState<Set<string>>(new Set()); // Track medications marked as taken in this session
  const [filter, setFilter] = useState<'all' | 'vital' | 'taken_medicines' | 'un_taken_medicines' | 'symptom'>('all');

  useEffect(() => {
    const id = localStorage.getItem('userId');
    if (id) {
      setUserId(id);
      loadEvents(id);
      loadMissedMedications(id);
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

  const loadMissedMedications = async (id: string) => {
    try {
      // Get all medications
      const medsResponse = await apiClient.getMedications(id);
      const allMeds = medsResponse.data;
      
      // Get today's medication events (taken) - get more days to ensure we catch recent events
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventsResponse = await apiClient.getEvents(id, 1); // Get last 1 day (today)
      const todayEvents = eventsResponse.data.filter((e: any) => {
        const eventDate = new Date(e.timestamp);
        return eventDate >= today && 
               e.type === 'medication' && 
               e.payload?.action === 'taken' &&
               e.payload?.medication_id; // Ensure medication_id exists
      });
      
      // Create Set of taken medication IDs
      const takenMedIds = new Set(
        todayEvents
          .map((e: any) => e.payload?.medication_id)
          .filter((id: any) => id) // Filter out undefined/null
      );
      
      // Combine with medications marked as taken in this session
      const allTakenIds = new Set([...Array.from(takenMedIds), ...Array.from(markedAsTakenIds)]);
      
      console.log('Taken medication IDs (from events):', Array.from(takenMedIds));
      console.log('Marked as taken in session:', Array.from(markedAsTakenIds));
      console.log('All taken IDs (including session):', Array.from(allTakenIds));
      console.log('All medications:', allMeds.map((m: any) => m.id));
      
      // Find medications NOT taken today AND not marked in this session
      const unTakenMeds = allMeds
        .filter((med: any) => {
          const isTaken = allTakenIds.has(med.id);
          if (isTaken) {
            console.log(`Medication ${med.id} (${med.name}) is already taken (today or in session)`);
          }
          return !isTaken;
        })
        .map((med: any) => ({
          id: med.id,
          medication_id: med.id,
          medication_name: med.name,
          medication_strength: med.strength,
          scheduled_time: med.created_at || new Date().toISOString(), // Use creation date
          status: 'pending',
          created_at: med.created_at
        }));
      
      console.log('Un-taken medications:', unTakenMeds.length);
      setMissedMeds(unTakenMeds);
    } catch (error) {
      console.error('Failed to load missed medications:', error);
      setMissedMeds([]);
    }
  };

  // Handle marking medication as taken from Health Records
  const handleMarkAsTakenFromRecords = async (med: MissedMedication) => {
    try {
      setMarkingTaken(med.id);
      setMessage(null);
      
      // Add to marked set IMMEDIATELY (before API call) - this ensures it stays removed
      setMarkedAsTakenIds(prev => new Set([...Array.from(prev), med.medication_id]));
      
      // Optimistic update: immediately remove from UI
      setMissedMeds(prev => prev.filter(m => m.id !== med.id));
      
      // Log as taken event
      const response = await apiClient.logEvent(userId!, {
        type: 'medication',
        payload: { 
          action: 'taken', 
          medication_id: med.medication_id,
          medication_name: med.medication_name,
          medication_strength: med.medication_strength
        },
        source: 'web',
        language: 'en',
      });

      // Show success message
      setMessage({ type: 'success', text: `✅ ${med.medication_name} marked as taken!` });
      
      // Reload events to show it in "Taken Medicines" section
      await loadEvents(userId!);
      
      // Don't reload missed medications - it's already removed and in the marked set
      // The medication will stay removed even if we refresh later because it's in markedAsTakenIds
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      // Revert: remove from marked set and add back to list
      setMarkedAsTakenIds(prev => {
        const updated = new Set(prev);
        updated.delete(med.medication_id);
        return updated;
      });
      
      setMissedMeds(prev => {
        const updated = [...prev, med];
        // Sort by scheduled_time to maintain order
        return updated.sort((a, b) => 
          new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime()
        );
      });
      
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to mark medication as taken';
      setMessage({ type: 'error', text: `❌ ${errorMsg}` });
      console.error('Failed to mark medication as taken:', error);
      
      // Clear error message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setMarkingTaken(null);
    }
  };

  // Helper function to convert missed med to event format
  const missedMedToEvent = (med: MissedMedication) => ({
    id: `missed-${med.id}`,
    timestamp: med.scheduled_time,
    type: 'medication',
    payload: {
      action: 'missed',
      medication_id: med.medication_id,
      medication_name: med.medication_name,
      medication_strength: med.medication_strength,
      status: med.status,
      isMissed: true,
      originalMed: med
    }
  });

  const filteredEvents = (() => {
    if (filter === 'all') {
      return [
        ...missedMeds.map(missedMedToEvent),
        ...events
      ];
    } else if (filter === 'taken_medicines') {
      return events.filter(e => e.type === 'medication' && e.payload?.action === 'taken');
    } else if (filter === 'un_taken_medicines') {
      return missedMeds.map(missedMedToEvent);
    } else {
      return events.filter(e => e.type === filter);
    }
  })();

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
      case 'taken_medicines':
        return '💊';
      case 'un_taken_medicines':
        return '❌';
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

      <div className="p-6 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 min-h-screen">
        {/* Filters - Enhanced */}
        <div className="mb-8 flex gap-3 flex-wrap">
          {([
            { key: 'all', label: 'All', icon: '📋' },
            { key: 'vital', label: 'Vital', icon: '📊' },
            { key: 'taken_medicines', label: 'Taken Medicines', icon: '✅' },
            { key: 'un_taken_medicines', label: 'Un-taken Medicines', icon: '❌' },
            { key: 'symptom', label: 'Symptom', icon: '😷' }
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={`px-5 py-3 rounded-xl font-bold transition-all duration-200 transform hover:scale-105 ${
                filter === f.key
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border-2 border-gray-200 shadow-md hover:shadow-lg'
              }`}
            >
              <span className="mr-2">{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>

        {/* Message Display - Enhanced */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border-2 shadow-lg ${
            message.type === 'success' 
              ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300 text-green-800' 
              : 'bg-gradient-to-r from-red-50 to-red-100 border-red-300 text-red-800'
          }`}>
            <p className="font-bold flex items-center gap-2">
              {message.type === 'success' ? '✅' : '❌'}
              {message.text}
            </p>
          </div>
        )}

        {/* Timeline */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Show all events (including missed medications) */}
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No health records found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((event) => {
                  // Check if this is a missed medication
                  const isMissedMed = event.payload?.isMissed === true;
                  const originalMed = event.payload?.originalMed;
                  
                  return (
                    <div
                      key={event.id}
                      className={`${
                        isMissedMed 
                          ? "bg-gradient-to-r from-red-50 to-red-100/50 border-l-4 border-red-500" 
                          : event.type === 'vital'
                          ? "bg-gradient-to-r from-white to-blue-50/30 border-l-4 border-blue-500"
                          : event.type === 'medication'
                          ? "bg-gradient-to-r from-white to-green-50/30 border-l-4 border-green-500"
                          : "bg-gradient-to-r from-white to-orange-50/30 border-l-4 border-orange-500"
                      } p-5 rounded-xl border-2 border-gray-200 hover:shadow-xl transition-all duration-200 transform hover:scale-[1.01]`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${
                          isMissedMed 
                            ? 'bg-red-100' 
                            : event.type === 'vital'
                            ? 'bg-blue-100'
                            : event.type === 'medication'
                            ? 'bg-green-100'
                            : 'bg-orange-100'
                        }`}>
                          <span className="text-3xl">{isMissedMed ? '❌' : getEventIcon(event.type)}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className={`font-bold text-lg capitalize ${
                              isMissedMed ? 'text-red-700' : 
                              event.type === 'vital' ? 'text-blue-700' :
                              event.type === 'medication' ? 'text-green-700' :
                              'text-orange-700'
                            }`}>
                              {isMissedMed ? 'Missed Medication' : (event.type === 'medication' ? 'Taken Medicine' : event.type)}
                            </h3>
                            <span className="text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                              {formatDate(event.timestamp)}
                            </span>
                          </div>
                          <div className="text-gray-700 space-y-2">
                          {event.type === 'vital' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {event.payload.bp && (
                                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                  <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1">Blood Pressure</p>
                                  <p className="text-lg font-bold text-red-700">{event.payload.bp} <span className="text-sm font-normal text-gray-600">mmHg</span></p>
                                </div>
                              )}
                              {event.payload.glucose && (
                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1">Glucose</p>
                                  <p className="text-lg font-bold text-amber-700">{event.payload.glucose} <span className="text-sm font-normal text-gray-600">mg/dL</span></p>
                                </div>
                              )}
                              {event.payload.weight && (
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Weight</p>
                                  <p className="text-lg font-bold text-blue-700">{event.payload.weight} <span className="text-sm font-normal text-gray-600">kg</span></p>
                                </div>
                              )}
                            </div>
                          )}
                          {event.type === 'medication' && (
                            <div>
                              {isMissedMed ? (
                                <>
                                  <p className="mb-3">
                                    <span className="font-medium text-red-700">Missed:</span>{' '}
                                    <span className="font-semibold text-blue-700">
                                      {event.payload.medication_name}
                                    </span>{' '}
                                    {event.payload.medication_strength && (
                                      <span className="text-gray-600">({event.payload.medication_strength})</span>
                                    )}
                                  </p>
                                  {originalMed && (
                                    <button
                                      onClick={() => handleMarkAsTakenFromRecords(originalMed)}
                                      disabled={markingTaken === originalMed.id || loading}
                                      className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-5 py-3 rounded-xl font-bold hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-2"
                                    >
                                      {markingTaken === originalMed.id ? (
                                        <>
                                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                          <span>Processing...</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-xl">✅</span>
                                          <span>Mark as Taken</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </>
                              ) : (
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
                              )}
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
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
