'use client';

import { useState } from 'react';
import AppContainer from './components/AppContainer';
import { apiClient } from './utils/api';

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [condition, setCondition] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.createUser({
        name: userName,
        email: userEmail,
        language: 'en',
        timezone: 'UTC',
        condition_profiles: condition ? [{
          condition: condition,
          thresholds: getThresholdsForCondition(condition),
          baseline: {}
        }] : []
      });

      setUserId(response.data.id);
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUserId(null);
    setUserName('');
    setUserEmail('');
    setCondition('');
    setShowForm(true);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {!userId && showForm ? (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
            <h1 className="text-3xl font-bold text-center mb-2 text-blue-700">🏥</h1>
            <h2 className="text-2xl font-bold text-center mb-1">Chronic Health Buddy</h2>
            <p className="text-center text-gray-600 mb-6">Get started on your health journey</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select or skip...</option>
                  <option value="diabetes">Diabetes</option>
                  <option value="hypertension">Hypertension</option>
                  <option value="asthma">Asthma</option>
                  <option value="thyroid">Thyroid</option>
                  <option value="heart">Heart Issues</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
              >
                {loading ? 'Creating...' : 'Get Started'}
              </button>
            </form>

            <p className="text-center text-xs text-gray-500 mt-4">
              Your health data is kept secure and private
            </p>
          </div>
        </div>
      ) : userId ? (
        <div>
          <AppContainer userId={userId} />
          
          {/* Logout button in corner */}
          <button
            onClick={handleLogout}
            className="fixed top-4 right-4 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      ) : null}
    </main>
  );
}

function getThresholdsForCondition(condition: string) {
  const thresholds: { [key: string]: any } = {
    diabetes: {
      glucose_high: 180,
      glucose_low: 70,
      glucose_normal: 100
    },
    hypertension: {
      bp_high: 140,
      bp_low: 90,
      bp_normal: "120/80"
    },
    asthma: {
      pf_low: 80
    },
    thyroid: {
      tsh_high: 4.0,
      tsh_low: 0.5
    },
    heart: {
      bp_high: 130,
      bp_low: 80
    }
  };

  return thresholds[condition] || {};
}
