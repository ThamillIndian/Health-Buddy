'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const isActive = (path: string) => pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    router.push('/');
  };

  const navItems = [
    { label: 'Dashboard', icon: '📊', path: '/dashboard' },
    { label: 'Log Entry', icon: '📝', path: '/log' },
    { label: 'Medications', icon: '💊', path: '/medications' },
    { label: 'Health Records', icon: '📋', path: '/health-records' },
    { label: 'Reports', icon: '📄', path: '/reports' },
    { label: 'Settings', icon: '⚙️', path: '/settings' },
  ];

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-4 z-50 bg-blue-600 text-white p-2 rounded-lg"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 text-white shadow-2xl transition-all duration-300 z-40 ${
          isOpen ? 'w-64' : 'w-20'
        } md:w-64`}
      >
        {/* Header */}
        <div className="p-6 border-b border-blue-600/50 bg-gradient-to-r from-blue-800/50 to-transparent">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <span className="text-3xl">🏥</span>
            </div>
            {isOpen && (
              <div>
                <h1 className="font-bold text-xl">Health Buddy</h1>
                <p className="text-xs text-blue-200">Your Health Companion</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 ${
                isActive(item.path)
                  ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className={`text-2xl transition-transform ${isActive(item.path) ? 'scale-110' : ''}`}>{item.icon}</span>
              {isOpen && <span className="font-semibold">{item.label}</span>}
              {isActive(item.path) && (
                <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
            </Link>
          ))}
        </nav>

        {/* Divider */}
        <div className="border-t border-blue-600/50 mt-6 mx-4"></div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-600/50 bg-gradient-to-t from-blue-900/50 to-transparent space-y-2">
          <Link
            href="/settings"
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 ${
              isActive('/settings')
                ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                : 'text-blue-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="text-xl">👤</span>
            {isOpen && <span className="font-semibold text-sm">Profile</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 text-red-200 hover:bg-red-600/30 hover:text-white rounded-xl transition-all duration-200 transform hover:scale-105 text-left border border-transparent hover:border-red-500/50"
          >
            <span className="text-xl">🔐</span>
            {isOpen && <span className="font-semibold text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content offset */}
      <div className={`transition-all duration-300 ${isOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        {/* This is where content goes */}
      </div>
    </>
  );
}
