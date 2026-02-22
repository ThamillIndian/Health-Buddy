'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/app/utils/api';
import { MEDICATIONS, SYMPTOMS, CRITICAL_SYMPTOMS } from '@/app/utils/constants';
import CriticalSymptomAlert from './CriticalSymptomAlert';
import VoiceInput from './VoiceInput';

interface QuickLogProps {
  userId: string;
  onEventLogged?: () => void;
}

interface SavedMedication {
  id: string;
  name: string;
  strength: string;
}

export default function QuickLog({ userId, onEventLogged }: QuickLogProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Med taken form - UPDATED: Now supports multiple medications
  const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
  const [savedMedications, setSavedMedications] = useState<SavedMedication[]>([]);
  const [showSavedMeds, setShowSavedMeds] = useState(false);

  // Vitals form
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [glucose, setGlucose] = useState('');
  const [weight, setWeight] = useState('');
  const [peakFlow, setPeakFlow] = useState('');

  // Symptoms form
  const [selectedSymptom, setSelectedSymptom] = useState('');
  const [symptomSeverity, setSymptomSeverity] = useState(2);
  
  // Critical symptom alert
  const [showCriticalAlert, setShowCriticalAlert] = useState(false);
  const [criticalSymptomData, setCriticalSymptomData] = useState<{ name: string; severity: number } | null>(null);

  // Voice input mode
  const [voiceMode, setVoiceMode] = useState<{ [key: string]: boolean }>({
    vitals: false,
    symptom: false,
    med: false,
  });

  // Manual log functionality for voice/note tab
  const [pendingNormalizedEvent, setPendingNormalizedEvent] = useState<any>(null);
  const [showManualLogButton, setShowManualLogButton] = useState(false);

  // Load saved medications on mount
  useEffect(() => {
    loadSavedMedications();
  }, [userId]);

  const loadSavedMedications = async () => {
    try {
      const response = await apiClient.getMedications(userId);
      setSavedMedications(response.data);
    } catch (error) {
      console.log('Could not load saved medications');
    }
  };

  // Handle multiple medications
  const toggleMedication = (medId: string) => {
    setSelectedMeds(prev =>
      prev.includes(medId)
        ? prev.filter(id => id !== medId)
        : [...prev, medId]
    );
  };

  const handleMedTaken = async () => {
    if (selectedMeds.length === 0) {
      setMessage('Please select at least one medication');
      return;
    }

    try {
      setLoading(true);
      
      // Log each selected medication with name included
      for (const medId of selectedMeds) {
        // Find medication name from saved medications or library
        const savedMed = savedMedications.find(m => m.id === medId);
        const libraryMed = MEDICATIONS.find(m => m.id === medId);
        
        // Better name extraction with fallback
        let medName = savedMed?.name || libraryMed?.name || 'Unknown';
        let medStrength = savedMed?.strength || '';
        
        // If name is still Unknown, try to extract from ID
        if (medName === 'Unknown' && medId) {
          // Try to parse name from ID (e.g., "glibenclamide_5" -> "Glibenclamide")
          const parts = medId.split('_');
          if (parts.length > 0) {
            // Capitalize first letter and make it readable
            medName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            // If there's a number part, try to extract strength
            if (parts.length > 1 && !medStrength) {
              const strengthPart = parts[1];
              // Check if it's a number (like "5", "50", "100")
              if (strengthPart.match(/^\d+$/)) {
                medStrength = strengthPart + 'mg';
              } else {
                medStrength = strengthPart;
              }
            }
          }
        }
        
        // If library med found but name includes strength, extract it
        if (libraryMed && libraryMed.name && !medStrength) {
          // Library names are like "Glibenclamide 5mg" - extract strength
          const nameParts = libraryMed.name.split(' ');
          if (nameParts.length > 1) {
            const lastPart = nameParts[nameParts.length - 1];
            if (lastPart.match(/\d+(mg|mcg|IU)/i)) {
              medStrength = lastPart;
              medName = nameParts.slice(0, -1).join(' ');
            }
          }
        }
        
        // Ensure we have a valid name (never use ID as fallback in display)
        if (!medName || medName === 'Unknown') {
          // Last resort: use ID but format it nicely
          medName = medId.split('_')[0].charAt(0).toUpperCase() + medId.split('_')[0].slice(1);
        }
        
        await apiClient.logEvent(userId, {
          type: 'medication',
          payload: { 
            action: 'taken', 
            medication_id: medId,
            medication_name: medName,
            medication_strength: medStrength
          },
          source: 'web',
          language: 'en',
        });
      }

      setMessage(`✅ ${selectedMeds.length} medication(s) logged!`);
      setSelectedMeds([]);
      setActiveTab(null);
      onEventLogged?.();

      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('❌ ' + (error.response?.data?.detail || 'Failed to log event'));
    } finally {
      setLoading(false);
    }
  };

  const handleVitalsSubmit = async () => {
    const payload: any = {};

    if (systolic && diastolic) {
      payload.vital_type = 'bp';
      payload.bp = `${systolic}/${diastolic}`;
    }

    if (glucose) {
      payload.glucose = parseInt(glucose);
    }

    if (weight) {
      payload.weight = parseFloat(weight);
    }

    if (peakFlow) {
      payload.peak_flow = parseInt(peakFlow);
      payload.vital_type = payload.vital_type || 'peak_flow';
    }

    if (Object.keys(payload).length === 0) {
      setMessage('Please enter at least one vital');
      return;
    }

    try {
      setLoading(true);
      await apiClient.logEvent(userId, {
        type: 'vital',
        payload,
        source: 'web',
        language: 'en',
      });

      setMessage('✅ Vitals logged!');
      setSystolic('');
      setDiastolic('');
      setGlucose('');
      setWeight('');
      setPeakFlow('');
      setActiveTab(null);
      onEventLogged?.();

      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('❌ ' + (error.response?.data?.detail || 'Failed to log event'));
    } finally {
      setLoading(false);
    }
  };

  // Handle voice transcription for vitals
  const handleVitalsVoiceTranscribe = (text: string) => {
    setMessage(`🎤 Transcribed: "${text}"`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleVitalsVoiceNormalize = (event: any) => {
    if (event && event.type === 'vital') {
      const payload = event.payload;
      
      // Auto-fill BP
      if (payload.bp) {
        const [sys, dia] = payload.bp.split('/');
        setSystolic(sys);
        setDiastolic(dia);
      }
      
      // Auto-fill glucose
      if (payload.glucose) {
        setGlucose(payload.glucose.toString());
      }
      
      // Auto-fill weight
      if (payload.weight) {
        setWeight(payload.weight.toString());
      }
      
      // Auto-fill peak flow
      if (payload.peak_flow) {
        setPeakFlow(payload.peak_flow.toString());
      }
      
      setMessage('✅ Form auto-filled from voice! Review and submit.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Handle voice transcription for symptoms
  const handleSymptomVoiceTranscribe = (text: string) => {
    setMessage(`🎤 Transcribed: "${text}"`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSymptomVoiceNormalize = (event: any) => {
    if (event && event.type === 'symptom') {
      const payload = event.payload;
      
      // Auto-fill symptom name
      if (payload.name) {
        // Try to find matching symptom from SYMPTOMS list
        const foundSymptom = SYMPTOMS.find(s => 
          s.name.toLowerCase() === payload.name.toLowerCase()
        );
        if (foundSymptom) {
          setSelectedSymptom(foundSymptom.name);
        } else {
          setSelectedSymptom(payload.name);
        }
      }
      
      // Auto-fill severity
      if (payload.severity) {
        setSymptomSeverity(payload.severity);
      }
      
      setMessage('✅ Symptom auto-filled from voice! Review and submit.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Handle voice transcription for medications
  const handleMedVoiceTranscribe = (text: string) => {
    setMessage(`🎤 Transcribed: "${text}"`);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleMedVoiceNormalize = (event: any) => {
    if (event && event.type === 'medication') {
      const payload = event.payload;
      
      // Try to find medication by name
      if (payload.medication_name) {
        const foundMed = savedMedications.find(m => 
          m.name.toLowerCase().includes(payload.medication_name.toLowerCase())
        ) || MEDICATIONS.find(m => 
          m.name.toLowerCase().includes(payload.medication_name.toLowerCase())
        );
        
        if (foundMed && !selectedMeds.includes(foundMed.id)) {
          toggleMedication(foundMed.id);
          setMessage(`✅ ${foundMed.name} added from voice!`);
          setTimeout(() => setMessage(''), 3000);
        }
      }
    }
  };

  // Handle voice transcription for general note/voice input
  const handleVoiceNoteTranscribe = (text: string) => {
    console.log('Transcript received:', text);
    // Clear any pending normalized event when new transcription starts
    if (text && text.trim()) {
      setPendingNormalizedEvent(null);
      setShowManualLogButton(false);
    }
    // Don't show message here - VoiceInput component handles display
  };

  const handleVoiceNoteNormalize = async (event: any) => {
    if (!event || !event.type) {
      setMessage('⚠️ Could not understand the voice input. Please try again.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    // Debug logging
    console.log('📋 Normalized event received:', event);
    console.log('📋 Event type:', event.type);
    console.log('📋 Event payload:', event.payload);
    
    // Store the event for manual review instead of auto-logging
    setPendingNormalizedEvent(event);
    setShowManualLogButton(true);
    
    // Show appropriate message based on event type
    if (event.type === 'vital') {
      const vitals = [];
      if (event.payload.bp) vitals.push(`BP: ${event.payload.bp}`);
      if (event.payload.glucose) vitals.push(`Glucose: ${event.payload.glucose}`);
      if (event.payload.weight) vitals.push(`Weight: ${event.payload.weight}kg`);
      if (event.payload.peak_flow) vitals.push(`Peak Flow: ${event.payload.peak_flow}`);
      
      setMessage(`✅ Detected vitals: ${vitals.join(', ')}. Click "Log Event" to save.`);
    } else if (event.type === 'symptom') {
      setMessage(`✅ Detected symptom: ${event.payload.name || 'Unknown'} (Severity: ${event.payload.severity || 2}/3). Click "Log Event" to save.`);
    } else if (event.type === 'medication') {
      setMessage(`✅ Detected medication: ${event.payload.medication_name || 'Unknown'}. Click "Log Event" to save.`);
    } else {
      setMessage('⚠️ Could not parse vitals. You can still log as a note.');
    }
    
    setTimeout(() => setMessage(''), 8000);
  };

  // Manual log function - logs the pending normalized event
  const handleManualLogEvent = async () => {
    if (!pendingNormalizedEvent) return;
    
    try {
      setLoading(true);
      
      const eventData = {
        type: pendingNormalizedEvent.type,
        payload: pendingNormalizedEvent.payload,
        source: 'voice',
        language: pendingNormalizedEvent.language || 'en',
        raw_text: pendingNormalizedEvent.original_text || undefined,
        confidence: pendingNormalizedEvent.confidence || undefined,
      };
      
      console.log('📤 Sending event to backend:', eventData);
      
      const response = await apiClient.logEvent(userId, eventData);
      
      console.log('✅ Event logged successfully:', response.data);

      // Handle critical symptoms
      if (pendingNormalizedEvent.type === 'symptom' && response.data.critical_symptom) {
        const symptomName = pendingNormalizedEvent.payload.name || 'Unknown';
        const severity = pendingNormalizedEvent.payload.severity || 2;
        setCriticalSymptomData({ name: symptomName, severity });
        setShowCriticalAlert(true);
        
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }

      setMessage(`✅ ${pendingNormalizedEvent.type} logged successfully!`);
      setPendingNormalizedEvent(null);
      setShowManualLogButton(false);
      onEventLogged?.();
      
      setTimeout(() => setMessage(''), 5000);
    } catch (error: any) {
      setMessage('❌ ' + (error.response?.data?.detail || 'Failed to log event'));
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSymptomSubmit = async () => {
    if (!selectedSymptom) {
      setMessage('Please select a symptom');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.logEvent(userId, {
        type: 'symptom',
        payload: { name: selectedSymptom, severity: symptomSeverity },
        source: 'web',
        language: 'en',
      });

      // Check if this is a critical symptom
      if (response.data.critical_symptom || 
          (CRITICAL_SYMPTOMS.includes(selectedSymptom) && symptomSeverity >= 3)) {
        setCriticalSymptomData({ name: selectedSymptom, severity: symptomSeverity });
        setShowCriticalAlert(true);
        
        // Request notification permission if not already granted
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }

      setMessage('✅ Symptom logged!');
      setSelectedSymptom('');
      setSymptomSeverity(2);
      setActiveTab(null);
      onEventLogged?.();

      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('❌ ' + (error.response?.data?.detail || 'Failed to log event'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          How are you feeling today?
        </h2>
        <p className="text-gray-600 text-sm">Quickly log your health data</p>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl text-center font-medium shadow-md transition-all ${
          message.includes('✅') 
            ? 'bg-green-50 border-2 border-green-200 text-green-800' 
            : message.includes('⚠️')
            ? 'bg-yellow-50 border-2 border-yellow-200 text-yellow-800'
            : 'bg-red-50 border-2 border-red-200 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {/* Quick Action Buttons - Enhanced */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setActiveTab(activeTab === 'med' ? null : 'med')}
          className={`group relative p-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
            activeTab === 'med'
              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50'
              : 'bg-white text-blue-700 border-2 border-blue-200 hover:border-blue-400 hover:shadow-md'
          }`}
        >
          <div className="text-3xl mb-2">💊</div>
          <div className="text-sm">Med Taken?</div>
          {activeTab === 'med' && (
            <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full animate-pulse"></div>
          )}
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'vitals' ? null : 'vitals')}
          className={`group relative p-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
            activeTab === 'vitals'
              ? 'bg-gradient-to-br from-green-600 to-green-700 text-white shadow-lg shadow-green-500/50'
              : 'bg-white text-green-700 border-2 border-green-200 hover:border-green-400 hover:shadow-md'
          }`}
        >
          <div className="text-3xl mb-2">📊</div>
          <div className="text-sm">Vitals?</div>
          {activeTab === 'vitals' && (
            <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full animate-pulse"></div>
          )}
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'symptom' ? null : 'symptom')}
          className={`group relative p-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
            activeTab === 'symptom'
              ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/50'
              : 'bg-white text-orange-700 border-2 border-orange-200 hover:border-orange-400 hover:shadow-md'
          }`}
        >
          <div className="text-3xl mb-2">😷</div>
          <div className="text-sm">Symptoms?</div>
          {activeTab === 'symptom' && (
            <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full animate-pulse"></div>
          )}
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'note' ? null : 'note')}
          className={`group relative p-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
            activeTab === 'note'
              ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/50'
              : 'bg-white text-purple-700 border-2 border-purple-200 hover:border-purple-400 hover:shadow-md'
          }`}
        >
          <div className="text-3xl mb-2">🎤</div>
          <div className="text-sm">Voice/Note</div>
          {activeTab === 'note' && (
            <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full animate-pulse"></div>
          )}
        </button>
      </div>

      {/* Med form - Multi-select with checkboxes */}
      {activeTab === 'med' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-blue-100 shadow-xl mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">💊</span>
              <span>Select Medications</span>
              <span className="text-sm font-normal text-gray-500">(Multiple OK)</span>
            </h3>
            <button
              onClick={() => setVoiceMode({ ...voiceMode, med: !voiceMode.med })}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 transform hover:scale-105 ${
                voiceMode.med
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              {voiceMode.med ? '✏️ Switch to Form' : '🎤 Use Voice'}
            </button>
          </div>

          {voiceMode.med ? (
            <div className="mb-4">
              <VoiceInput
                userId={userId}
                language="en-IN"
                mode="transcribe"
                onTranscribe={handleMedVoiceTranscribe}
                onNormalize={handleMedVoiceNormalize}
              />
            </div>
          ) : (
            <>
          
          {/* Show saved medications first */}
          {savedMedications.length > 0 && (
            <div className="mb-6 pb-4 border-b-2 border-gray-100">
              <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span>📌</span>
                <span>Your Medications:</span>
              </p>
              <div className="space-y-2">
                {savedMedications.map((med) => (
                  <label key={med.id} className="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl cursor-pointer transition-all border-2 border-transparent hover:border-blue-200">
                    <input
                      type="checkbox"
                      checked={selectedMeds.includes(med.id)}
                      onChange={() => toggleMedication(med.id)}
                      className="w-5 h-5 cursor-pointer text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                    />
                    <span className="flex-1 text-green-700 font-semibold">{med.name} {med.strength}</span>
                    {selectedMeds.includes(med.id) && (
                      <span className="text-green-500 text-xl">✓</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Library medications */}
          <div className="max-h-64 overflow-y-auto mb-6 border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-br from-gray-50 to-white">
            <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">Available from Library:</p>
            <div className="space-y-2">
              {MEDICATIONS.map((med) => (
                <label key={med.id} className="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-lg cursor-pointer transition-all border-2 border-transparent hover:border-blue-200">
                  <input
                    type="checkbox"
                    checked={selectedMeds.includes(med.id)}
                    onChange={() => toggleMedication(med.id)}
                    className="w-5 h-5 cursor-pointer text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                  />
                  <span className="text-xl">{med.icon}</span>
                  <span className="flex-1 text-sm font-medium text-gray-700">{med.name}</span>
                  {selectedMeds.includes(med.id) && (
                    <span className="text-blue-500 text-xl">✓</span>
                  )}
                </label>
              ))}
            </div>
          </div>
          
          {selectedMeds.length > 0 && (
            <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border-2 border-blue-200 text-sm font-semibold text-blue-800 flex items-center justify-center gap-2">
              <span className="text-xl">✅</span>
              <span>{selectedMeds.length} medication(s) selected</span>
            </div>
          )}
          
          <button
            onClick={handleMedTaken}
            disabled={loading || selectedMeds.length === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Logging...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Confirm Taken ({selectedMeds.length})</span>
              </>
            )}
          </button>
            </>
          )}
        </div>
      )}

      {/* Vitals form */}
      {activeTab === 'vitals' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-green-100 shadow-xl mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <span>Enter Vitals</span>
            </h3>
            <button
              onClick={() => setVoiceMode({ ...voiceMode, vitals: !voiceMode.vitals })}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 transform hover:scale-105 ${
                voiceMode.vitals
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              {voiceMode.vitals ? '✏️ Switch to Form' : '🎤 Use Voice'}
            </button>
          </div>

          {voiceMode.vitals ? (
            <div className="mb-4">
              <VoiceInput
                userId={userId}
                language="en-IN"
                mode="transcribe"
                onTranscribe={handleVitalsVoiceTranscribe}
                onNormalize={handleVitalsVoiceNormalize}
              />
            </div>
          ) : (
            <>

          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Blood Pressure (mmHg)</label>
            <div className="flex gap-3 items-center">
              <input
                type="number"
                placeholder="Systolic"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                className="flex-1 p-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none font-medium"
              />
              <span className="text-2xl font-bold text-gray-400">/</span>
              <input
                type="number"
                placeholder="Diastolic"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                className="flex-1 p-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none font-medium"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Glucose (mg/dL)</label>
            <input
              type="number"
              placeholder="Enter glucose level"
              value={glucose}
              onChange={(e) => setGlucose(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none font-medium"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              placeholder="Enter weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none font-medium"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">Peak Flow (L/min)</label>
            <input
              type="number"
              placeholder="Enter peak flow"
              value={peakFlow}
              onChange={(e) => setPeakFlow(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all outline-none font-medium mb-2"
            />
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span>🫁</span>
              <span>For asthma/respiratory tracking</span>
            </p>
          </div>

          <button
            onClick={handleVitalsSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Logging...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Log Vitals</span>
              </>
            )}
          </button>
            </>
          )}
        </div>
      )}

      {/* Symptoms form */}
      {activeTab === 'symptom' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-orange-100 shadow-xl mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">😷</span>
              <span>Select Symptom</span>
            </h3>
            <button
              onClick={() => setVoiceMode({ ...voiceMode, symptom: !voiceMode.symptom })}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 transform hover:scale-105 ${
                voiceMode.symptom
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              {voiceMode.symptom ? '✏️ Switch to Form' : '🎤 Use Voice'}
            </button>
          </div>

          {voiceMode.symptom ? (
            <div className="mb-4">
              <VoiceInput
                userId={userId}
                language="en-IN"
                mode="transcribe"
                onTranscribe={handleSymptomVoiceTranscribe}
                onNormalize={handleSymptomVoiceNormalize}
              />
            </div>
          ) : (
            <>

          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">Select Symptom</label>
            <select
              value={selectedSymptom}
              onChange={(e) => setSelectedSymptom(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none font-medium bg-white"
            >
              <option value="">Choose symptom...</option>
              {SYMPTOMS.map((sym) => (
                <option key={sym.name} value={sym.name}>
                  {sym.icon} {sym.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">Severity Level</label>
            <div className="flex gap-3">
              {[1, 2, 3].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSymptomSeverity(sev)}
                  className={`flex-1 p-4 rounded-xl font-bold transition-all duration-200 transform hover:scale-105 ${
                    symptomSeverity === sev
                      ? sev === 1
                        ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg'
                        : sev === 2
                        ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg'
                        : 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {sev === 1 ? '😊 Mild' : sev === 2 ? '😐 Moderate' : '😰 Severe'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSymptomSubmit}
            disabled={loading || !selectedSymptom}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white p-4 rounded-xl font-bold text-lg hover:from-orange-700 hover:to-orange-800 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Logging...</span>
              </>
            ) : (
              <>
                <span>✓</span>
                <span>Log Symptom</span>
              </>
            )}
          </button>
            </>
          )}
        </div>
      )}

      {/* Voice/Note form */}
      {activeTab === 'note' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-purple-100 shadow-xl mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-2">
              <span className="text-2xl">🎤</span>
              <span>Voice Input</span>
            </h3>
            <p className="text-sm text-gray-600">
              Speak naturally about your health. We'll automatically detect if it's a vital, symptom, or medication.
            </p>
          </div>
          
          <VoiceInput
            userId={userId}
            language="en-IN"
            mode="transcribe"
            onTranscribe={handleVoiceNoteTranscribe}
            onNormalize={handleVoiceNoteNormalize}
          />
          
          {/* Manual Log Button - appears after normalization */}
          {showManualLogButton && pendingNormalizedEvent && (
            <div className="mt-6 p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-2xl shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📋</span>
                <h4 className="font-bold text-xl text-gray-800">Ready to Log Event</h4>
              </div>
              
              <div className="bg-white p-4 rounded-xl border-2 border-yellow-200 mb-4 shadow-inner">
                <div className="mb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Event Type</span>
                  <p className="text-lg font-bold text-purple-700 capitalize mt-1">{pendingNormalizedEvent.type}</p>
                </div>
                <div className="mb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Data Extracted</span>
                  <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-40 border border-gray-200 mt-2 font-mono">
                    {JSON.stringify(pendingNormalizedEvent.payload, null, 2)}
                  </pre>
                </div>
                {pendingNormalizedEvent.confidence && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">Confidence:</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${(pendingNormalizedEvent.confidence * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-gray-700">{(pendingNormalizedEvent.confidence * 100).toFixed(0)}%</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleManualLogEvent}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Logging...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">✅</span>
                      <span>Log Event</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowManualLogButton(false);
                    setPendingNormalizedEvent(null);
                    setMessage('');
                  }}
                  disabled={loading}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 disabled:bg-gray-100 transition-all duration-200 transform hover:scale-105"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Manual close button for testing */}
          <div className="mt-6">
            <button
              onClick={() => {
                setActiveTab(null);
                setShowManualLogButton(false);
                setPendingNormalizedEvent(null);
              }}
              className="w-full py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-bold hover:from-gray-600 hover:to-gray-700 transition-all duration-200 transform hover:scale-[1.02] shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <span>✓</span>
              <span>Done - Close Tab</span>
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl">
            <p className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-lg">💡</span>
              <span>Examples:</span>
            </p>
            <ul className="space-y-1.5 text-xs text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>"My blood pressure is 140 over 90"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>"I have a headache, severity 3"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>"I took my metformin"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">•</span>
                <span>"My glucose is 120"</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Critical Symptom Alert Modal */}
      {showCriticalAlert && criticalSymptomData && (
        <CriticalSymptomAlert
          symptomName={criticalSymptomData.name}
          severity={criticalSymptomData.severity}
          onDismiss={() => {
            setShowCriticalAlert(false);
            setCriticalSymptomData(null);
          }}
        />
      )}
    </div>
  );
}
