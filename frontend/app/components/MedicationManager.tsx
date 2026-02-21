'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/app/utils/api';
import { MEDICATIONS } from '@/app/utils/constants';

interface MedicationManagerProps {
  userId: string;
  onClose?: () => void;
}

interface Medication {
  id: string;
  name: string;
  strength: string;
  category: string;
  frequency: string;
  times: string[];
  active: boolean;
  notes?: string;
}

export default function MedicationManager({ userId, onClose }: MedicationManagerProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view');

  // Add med form
  const [selectedMedTemplate, setSelectedMedTemplate] = useState('');
  const [customName, setCustomName] = useState('');
  const [strength, setStrength] = useState('');
  const [frequency, setFrequency] = useState('once_daily');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [notes, setNotes] = useState('');

  // Load medications
  const loadMedications = async () => {
    try {
      const response = await apiClient.getMedications(userId);
      setMedications(response.data);
    } catch (error: any) {
      setMessage('❌ Failed to load medications');
    }
  };

  useEffect(() => {
    loadMedications();
  }, [userId]);

  // Handle adding medication
  const handleAddMedication = async () => {
    const medName = customName || selectedMedTemplate;
    
    if (!medName || !strength) {
      setMessage('❌ Please enter medication name and strength');
      return;
    }

    try {
      setLoading(true);

      // Find category from MEDICATIONS list
      let category = 'other';
      const template = MEDICATIONS.find(m => m.id === selectedMedTemplate);
      if (template) {
        category = template.category;
      }

      await apiClient.addMedication(userId, {
        name: medName,
        strength: strength,
        category: category,
        frequency: frequency,
        times: times,
        notes: notes
      });

      setMessage('✅ Medication added!');
      setCustomName('');
      setSelectedMedTemplate('');
      setStrength('');
      setFrequency('once_daily');
      setTimes(['08:00']);
      setNotes('');
      setActiveTab('view');

      // Reload medications
      await loadMedications();

      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('❌ Failed to add medication');
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting medication
  const handleDeleteMedication = async (medId: string) => {
    if (!confirm('Are you sure you want to delete this medication?')) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.deleteMedication(userId, medId);
      setMessage('✅ Medication deleted!');
      await loadMedications();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage('❌ Failed to delete medication');
    } finally {
      setLoading(false);
    }
  };


  // Add/remove time slots
  const addTimeSlot = () => {
    setTimes([...times, '12:00']);
  };

  const removeTimeSlot = (index: number) => {
    setTimes(times.filter((_, i) => i !== index));
  };

  const updateTimeSlot = (index: number, value: string) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  // Get template med details
  const templateMed = MEDICATIONS.find(m => m.id === selectedMedTemplate);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-700">💊 My Medications</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        )}
      </div>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('view')}
          className={`px-4 py-2 rounded font-semibold transition ${
            activeTab === 'view'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          📋 My Medications ({medications.length})
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`px-4 py-2 rounded font-semibold transition ${
            activeTab === 'add'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ➕ Add New
        </button>
      </div>

      {/* View Medications */}
      {activeTab === 'view' && (
        <div className="space-y-3">
          {medications.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500 mb-3">No medications added yet</p>
              <button
                onClick={() => setActiveTab('add')}
                className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700"
              >
                Add Your First Medication
              </button>
            </div>
          ) : (
            medications.map(med => (
              <div key={med.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{med.name} {med.strength}</h3>
                    <p className="text-sm text-gray-600 capitalize">{med.category}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteMedication(med.id)}
                    className="text-red-500 hover:text-red-700 font-semibold text-sm"
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>

                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p className="font-medium mb-1">📅 {med.frequency.replace('_', ' ').toUpperCase()}</p>
                  <p className="text-gray-700">⏰ Times: {med.times.join(', ')}</p>
                </div>

                {med.notes && (
                  <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded mt-2">
                    <p className="font-medium">Notes:</p>
                    <p>{med.notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Medication */}
      {activeTab === 'add' && (
        <div className="bg-white p-6 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-lg mb-4">Add New Medication</h3>

          {/* Choose from template or custom */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select from Library or Enter Custom Name</label>
            <select
              value={selectedMedTemplate}
              onChange={(e) => setSelectedMedTemplate(e.target.value)}
              className="w-full p-2 border rounded mb-2"
            >
              <option value="">-- Select from predefined medications --</option>
              {MEDICATIONS.map(med => (
                <option key={med.id} value={med.id}>
                  {med.icon} {med.name}
                </option>
              ))}
            </select>

            {!selectedMedTemplate && (
              <div>
                <label className="block text-sm font-medium mb-1">Or enter custom name:</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., My Special Medication"
                  className="w-full p-2 border rounded"
                />
              </div>
            )}

            {templateMed && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                Selected: {templateMed.icon} {templateMed.name}
              </div>
            )}
          </div>

          {/* Strength */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Strength/Dosage</label>
            <input
              type="text"
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              placeholder="e.g., 500mg, 10mg, 1 tablet"
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Frequency */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="once_daily">Once Daily</option>
              <option value="twice_daily">Twice Daily</option>
              <option value="thrice_daily">Three Times Daily</option>
              <option value="as_needed">As Needed</option>
            </select>
          </div>

          {/* Times */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              ⏰ Times to take medication
            </label>
            <div className="space-y-2">
              {times.map((time, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => updateTimeSlot(index, e.target.value)}
                    className="flex-1 p-2 border rounded"
                  />
                  {times.length > 1 && (
                    <button
                      onClick={() => removeTimeSlot(index)}
                      className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addTimeSlot}
              className="mt-2 px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-sm font-semibold"
            >
              + Add Time
            </button>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Take with food, avoid dairy products"
              className="w-full p-2 border rounded"
              rows={2}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleAddMedication}
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Adding...' : '✅ Add Medication'}
          </button>
        </div>
      )}
    </div>
  );
}
