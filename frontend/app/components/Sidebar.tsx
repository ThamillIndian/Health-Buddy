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
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-blue-700 to-blue-900 text-white shadow-lg transition-all duration-300 z-40 ${
          isOpen ? 'w-64' : 'w-20'
        } md:w-64`}
      >
        {/* Header */}
        <div className="p-6 border-b border-blue-600">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏥</span>
            {isOpen && <h1 className="font-bold text-lg">Health Buddy</h1>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg transition ${
                isActive(item.path)
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'text-blue-100 hover:bg-blue-600'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {isOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Divider */}
        <div className="border-t border-blue-600 mt-8 mx-4"></div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-600 space-y-2">
          <Link
            href="/settings"
            className={`flex items-center gap-4 px-4 py-3 rounded-lg transition ${
              isActive('/settings')
                ? 'bg-blue-500'
                : 'text-blue-100 hover:bg-blue-600'
            }`}
          >
            <span className="text-xl">👤</span>
            {isOpen && <span className="text-sm">Profile</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-3 text-red-200 hover:bg-red-600 rounded-lg transition text-left"
          >
            <span className="text-xl">🔐</span>
            {isOpen && <span className="text-sm">Logout</span>}
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
