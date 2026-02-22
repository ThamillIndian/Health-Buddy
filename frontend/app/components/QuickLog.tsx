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
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">
        How are you feeling today?
      </h2>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
          {message}
        </div>
      )}

      {/* Quick buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setActiveTab(activeTab === 'med' ? null : 'med')}
          className={`p-4 rounded-lg font-semibold transition ${
            activeTab === 'med'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          💊 Med Taken?
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'vitals' ? null : 'vitals')}
          className={`p-4 rounded-lg font-semibold transition ${
            activeTab === 'vitals'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          📊 Vitals?
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'symptom' ? null : 'symptom')}
          className={`p-4 rounded-lg font-semibold transition ${
            activeTab === 'symptom'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          😷 Symptoms?
        </button>

        <button
          onClick={() => setActiveTab(activeTab === 'note' ? null : 'note')}
          className={`p-4 rounded-lg font-semibold transition ${
            activeTab === 'note'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          🎤 Voice/Note
        </button>
      </div>

      {/* Med form - Multi-select with checkboxes */}
      {activeTab === 'med' && (
        <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">💊 Select Medications (Multiple OK)</h3>
            <button
              onClick={() => setVoiceMode({ ...voiceMode, med: !voiceMode.med })}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                voiceMode.med
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300'
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
            <div className="mb-4 pb-4 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">📌 Your Medications:</p>
              <div className="space-y-1 mb-3">
                {savedMedications.map((med) => (
                  <label key={med.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMeds.includes(med.id)}
                      onChange={() => toggleMedication(med.id)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="flex-1 text-green-700 font-medium">{med.name} {med.strength}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Library medications */}
          <div className="max-h-64 overflow-y-auto mb-4 border rounded p-3 bg-gray-50">
            <p className="text-xs text-gray-600 mb-2 font-medium">Available from Library:</p>
            {MEDICATIONS.map((med) => (
              <label key={med.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer mb-1">
                <input
                  type="checkbox"
                  checked={selectedMeds.includes(med.id)}
                  onChange={() => toggleMedication(med.id)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-lg">{med.icon}</span>
                <span className="flex-1 text-sm">{med.name}</span>
              </label>
            ))}
          </div>
          
          {selectedMeds.length > 0 && (
            <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200 text-sm">
              ✅ {selectedMeds.length} medication(s) selected
            </div>
          )}
          
          <button
            onClick={handleMedTaken}
            disabled={loading || selectedMeds.length === 0}
            className="w-full bg-blue-600 text-white p-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Logging...' : `Confirm Taken (${selectedMeds.length})`}
          </button>
            </>
          )}
        </div>
      )}

      {/* Vitals form */}
      {activeTab === 'vitals' && (
        <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Enter Vitals</h3>
            <button
              onClick={() => setVoiceMode({ ...voiceMode, vitals: !voiceMode.vitals })}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                voiceMode.vitals
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300'
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

          <div className="mb-3">
            <label className="text-sm font-medium">Blood Pressure</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Systolic"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                className="flex-1 p-2 border rounded"
              />
              <span className="flex items-center">/</span>
              <input
                type="number"
                placeholder="Diastolic"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                className="flex-1 p-2 border rounded"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="text-sm font-medium">Glucose (mg/dL)</label>
            <input
              type="number"
              placeholder="Enter glucose"
              value={glucose}
              onChange={(e) => setGlucose(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="mb-3">
            <label className="text-sm font-medium">Weight (kg)</label>
            <input
              type="number"
              placeholder="Enter weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="mb-3">
            <label className="text-sm font-medium">Peak Flow (L/min)</label>
            <input
              type="number"
              placeholder="Enter peak flow"
              value={peakFlow}
              onChange={(e) => setPeakFlow(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-500 mt-1">🫁 For asthma/respiratory tracking</p>
          </div>

          <button
            onClick={handleVitalsSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Logging...' : 'Log Vitals'}
          </button>
            </>
          )}
        </div>
      )}

      {/* Symptoms form */}
      {activeTab === 'symptom' && (
        <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Select Symptom</h3>
            <button
              onClick={() => setVoiceMode({ ...voiceMode, symptom: !voiceMode.symptom })}
              className={`px-3 py-1 rounded text-sm font-medium transition ${
                voiceMode.symptom
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300'
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

          <select
            value={selectedSymptom}
            onChange={(e) => setSelectedSymptom(e.target.value)}
            className="w-full p-2 border rounded mb-3"
          >
            <option value="">Choose symptom...</option>
            {SYMPTOMS.map((sym) => (
              <option key={sym.name} value={sym.name}>
                {sym.icon} {sym.name}
              </option>
            ))}
          </select>

          <div className="mb-3">
            <label className="text-sm font-medium">Severity</label>
            <div className="flex gap-2">
              {[1, 2, 3].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSymptomSeverity(sev)}
                  className={`flex-1 p-2 rounded ${
                    symptomSeverity === sev
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  {sev === 1 ? 'Mild' : sev === 2 ? 'Moderate' : 'Severe'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSymptomSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Logging...' : 'Log Symptom'}
          </button>
            </>
          )}
        </div>
      )}

      {/* Voice/Note form */}
      {activeTab === 'note' && (
        <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
          <h3 className="font-semibold mb-3">🎤 Voice Input</h3>
          <p className="text-sm text-gray-600 mb-4">
            Speak naturally about your health. We'll automatically detect if it's a vital, symptom, or medication.
          </p>
          
          <VoiceInput
            userId={userId}
            language="en-IN"
            mode="transcribe"
            onTranscribe={handleVoiceNoteTranscribe}
            onNormalize={handleVoiceNoteNormalize}
          />
          
          {/* Manual Log Button - appears after normalization */}
          {showManualLogButton && pendingNormalizedEvent && (
            <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">📋</span>
                <h4 className="font-bold text-lg text-yellow-900">Ready to Log Event</h4>
              </div>
              
              <div className="bg-white p-3 rounded border border-yellow-200 mb-3">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Type:</strong> <span className="font-semibold text-blue-700 capitalize">{pendingNormalizedEvent.type}</span>
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Payload:</strong>
                </p>
                <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32 border border-gray-200">
                  {JSON.stringify(pendingNormalizedEvent.payload, null, 2)}
                </pre>
                {pendingNormalizedEvent.confidence && (
                  <p className="text-xs text-gray-600 mt-2">
                    Confidence: {(pendingNormalizedEvent.confidence * 100).toFixed(0)}%
                  </p>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleManualLogEvent}
                  disabled={loading}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Logging...</span>
                    </>
                  ) : (
                    <>
                      <span>✅</span>
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
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 disabled:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Manual close button for testing */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                setActiveTab(null);
                setShowManualLogButton(false);
                setPendingNormalizedEvent(null);
              }}
              className="flex-1 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition"
            >
              ✓ Done - Close Tab
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-gray-700">
              <strong>💡 Examples:</strong><br/>
              • "My blood pressure is 140 over 90"<br/>
              • "I have a headache, severity 3"<br/>
              • "I took my metformin"<br/>
              • "My glucose is 120"
            </p>
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
