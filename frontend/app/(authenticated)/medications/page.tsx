'use client';

import Header from '@/app/components/Header';
import MedicationManager from '@/app/components/MedicationManager';
import { useUserId } from '@/app/hooks/useUserId';

export default function MedicationsPage() {
  const { userId, loading } = useUserId();

  return (
    <div>
      <Header
        title="My Medications"
        subtitle="Manage your daily medications"
      />

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        ) : userId ? (
          <div className="max-w-4xl">
            <MedicationManager userId={userId} />
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800 font-medium">⚠️ Unable to load profile</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
