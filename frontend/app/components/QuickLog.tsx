'use client';

import { useState } from 'react';
import { apiClient } from '@/app/utils/api';
import { MEDICATIONS, SYMPTOMS } from '@/app/utils/constants';

interface QuickLogProps {
  userId: string;
  onEventLogged?: () => void;
}

export default function QuickLog({ userId, onEventLogged }: QuickLogProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Med taken form
  const [selectedMed, setSelectedMed] = useState('');

  // Vitals form
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [glucose, setGlucose] = useState('');
  const [weight, setWeight] = useState('');

  // Symptoms form
  const [selectedSymptom, setSelectedSymptom] = useState('');
  const [symptomSeverity, setSymptomSeverity] = useState(2);

  const handleMedTaken = async () => {
    if (!selectedMed) {
      setMessage('Please select a medication');
      return;
    }

    try {
      setLoading(true);
      await apiClient.logEvent(userId, {
        type: 'medication',
        payload: { action: 'taken', medication_id: selectedMed },
        source: 'web',
        language: 'en',
      });

      setMessage('✅ Medication logged!');
      setSelectedMed('');
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
      setActiveTab(null);
      onEventLogged?.();

      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('❌ ' + (error.response?.data?.detail || 'Failed to log event'));
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
      await apiClient.logEvent(userId, {
        type: 'symptom',
        payload: { name: selectedSymptom, severity: symptomSeverity },
        source: 'web',
        language: 'en',
      });

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

      {/* Med form */}
      {activeTab === 'med' && (
        <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
          <h3 className="font-semibold mb-3">Select Medication</h3>
          <select
            value={selectedMed}
            onChange={(e) => setSelectedMed(e.target.value)}
            className="w-full p-2 border rounded mb-3"
          >
            <option value="">Choose medication...</option>
            {MEDICATIONS.map((med) => (
              <option key={med.id} value={med.id}>
                {med.icon} {med.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleMedTaken}
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Logging...' : 'Confirm Taken'}
          </button>
        </div>
      )}

      {/* Vitals form */}
      {activeTab === 'vitals' && (
        <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
          <h3 className="font-semibold mb-3">Enter Vitals</h3>

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

          <button
            onClick={handleVitalsSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Logging...' : 'Log Vitals'}
          </button>
        </div>
      )}

      {/* Symptoms form */}
      {activeTab === 'symptom' && (
        <div className="bg-white p-4 rounded-lg border border-blue-200 mb-4">
          <h3 className="font-semibold mb-3">Select Symptom</h3>

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
        </div>
      )}
    </div>
  );
}
