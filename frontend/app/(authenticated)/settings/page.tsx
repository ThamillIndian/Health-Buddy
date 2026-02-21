'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import { apiClient } from '@/app/utils/api';

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notifications, setNotifications] = useState({
    medications: true,
    alerts: true,
    summary: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const id = localStorage.getItem('userId');
    const name = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');

    if (id) {
      setUserId(id);
      setUserName(name || '');
      setUserEmail(email || '');
    }
  }, []);

  const handleSaveProfile = async () => {
    if (!userId) return;

    try {
      setSaving(true);
      await apiClient.updateUser(userId, {
        name: userName,
        email: userEmail,
        language,
      });
      localStorage.setItem('userName', userName);
      localStorage.setItem('userEmail', userEmail);
      setMessage('✅ Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    router.push('/');
  };

  return (
    <div>
      <Header
        title="Settings"
        subtitle="Manage your preferences and account"
      />

      <div className="p-6">
        <div className="max-w-2xl space-y-6">
          {message && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-semibold">
              {message}
            </div>
          )}

          {/* Profile Section */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">👤 Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                  <option value="kn">Kannada</option>
                </select>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold"
              >
                {saving ? '⏳ Saving...' : '✅ Save Profile'}
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">🔔 Notifications</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={notifications.medications}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      medications: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <span>Medication reminders</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={notifications.alerts}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      alerts: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <span>Health alerts</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={notifications.summary}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      summary: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                <span>Weekly summary</span>
              </label>
            </div>
          </div>

          {/* Theme */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">🎨 Theme</h2>
            <div className="flex gap-4">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={theme === 'light'}
                  onChange={() => setTheme('light')}
                  className="w-4 h-4"
                />
                <span>☀️ Light Mode</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={theme === 'dark'}
                  onChange={() => setTheme('dark')}
                  className="w-4 h-4"
                />
                <span>🌙 Dark Mode</span>
              </label>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 p-6 rounded-lg border border-red-200">
            <h2 className="text-xl font-semibold mb-4 text-red-700">⚠️ Danger Zone</h2>
            <div className="space-y-2">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
              >
                🔐 Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
