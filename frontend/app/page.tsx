'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from './utils/api';

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [condition, setCondition] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    if (savedUserId) {
      // User is logged in, redirect to dashboard
      router.push('/dashboard');
      return;
    }
    setCheckingSession(false);
  }, [router]);

  const getThresholdsForCondition = (cond: string) => {
    const thresholds: Record<string, any> = {
      diabetes: { glucose_normal: [70, 140], glucose_caution: [140, 180] },
      hypertension: { bp_normal: '140/90', bp_caution: '160/100' },
      asthma: { peak_flow_normal: 80 },
      thyroid: { tsh_normal: [0.4, 4.0] },
      heart: { resting_hr: [60, 100] },
    };
    return thresholds[cond] || {};
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

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

      const userId = response.data.id;
      const userCreatedAt = new Date(response.data.created_at);
      const now = new Date();
      const timeDiff = now.getTime() - userCreatedAt.getTime();
      const isExistingUser = timeDiff > 60000;

      localStorage.setItem('userId', userId);
      localStorage.setItem('userName', response.data.name || userName);
      localStorage.setItem('userEmail', userEmail);
      
      if (isExistingUser) {
        setSuccessMessage('✅ Welcome back! Logged into your existing account.');
      } else {
        setSuccessMessage('✅ Account created successfully! Welcome to Chronic Health Buddy.');
      }

      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Restoring your session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-4xl mb-2">🏥</h1>
            <h2 className="text-3xl font-bold text-blue-700 mb-2">Chronic Health Buddy</h2>
            <p className="text-gray-600">Your daily health companion</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm font-medium">
              ❌ {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm font-semibold">
              {successMessage}
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
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Condition (Optional)
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a condition...</option>
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
              className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? '⏳ Creating...' : '✅ Get Started'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-4">
            Your health data is kept secure and private
          </p>
        </div>
      </div>
    </main>
  );
}
