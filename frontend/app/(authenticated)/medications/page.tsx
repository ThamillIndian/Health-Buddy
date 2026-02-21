'use client';

import { useState, useEffect } from 'react';
import Header from '@/app/components/Header';
import MedicationManager from '@/app/components/MedicationManager';

export default function MedicationsPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('userId');
    if (id) {
      setUserId(id);
    }
  }, []);

  return (
    <div>
      <Header
        title="My Medications"
        subtitle="Manage your daily medications"
      />

      <div className="p-6">
        {userId ? (
          <div className="max-w-4xl">
            <MedicationManager userId={userId} />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        )}
      </div>
    </div>
  );
}
