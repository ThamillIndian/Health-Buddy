'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import { apiClient } from '@/app/utils/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get user data from Supabase Auth
        setUserEmail(user.email || '');
        setUserName(user.user_metadata?.name || '');

        // Try to fetch additional profile data from database
        const { data: profileData, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', user.id)
          .single();

        if (profileData) {
          setUserId(profileData.id);
          setUserName(profileData.name || user.user_metadata?.name || '');
          setLanguage(profileData.language || 'en');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Update Supabase Auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: userName,
        }
      });

      if (authError) throw authError;

      // Update profile in database if userId exists
      if (userId) {
        const { error: dbError } = await supabase
          .from('users')
          .update({
            name: userName,
            language: language,
            updated_at: new Date().toISOString(),
          })
          .eq('auth_id', user.id);

        if (dbError) throw dbError;
      }

      setMessage('✅ Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage('❌ Failed to update profile: ' + (error.message || 'Unknown error'));
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div>
        <Header
          title="Settings"
          subtitle="Manage your preferences and account"
        />
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Settings"
        subtitle="Manage your preferences and account"
      />

      <div className="p-6">
        <div className="max-w-2xl space-y-6">
          {/* User Info Banner */}
          {user && (
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <span className="text-3xl">👤</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{userName || 'User'}</h3>
                  <p className="text-blue-100">{userEmail}</p>
                  <p className="text-xs text-blue-200 mt-1">
                    Signed in via {user.app_metadata?.provider || 'email'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className={`p-4 rounded-lg font-semibold ${
              message.includes('✅') 
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
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
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  title="Email cannot be changed (managed by authentication)"
                />
                <p className="text-xs text-gray-500 mt-1">Email is managed by your authentication provider</p>
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
