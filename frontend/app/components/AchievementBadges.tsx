'use client';

import { useState } from 'react';

interface AchievementBadgesProps {
  adherence: number;
  daysLogged: number;
  alertsFree: boolean;
  streak: number;
}

export default function AchievementBadges({
  adherence,
  daysLogged,
  alertsFree,
  streak,
}: AchievementBadgesProps) {
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);

  const badges = [
    {
      id: 'perfect-adherence',
      title: '💊 Perfect Adherence',
      description: 'Maintain 90%+ medication adherence',
      icon: '💊',
      unlocked: adherence >= 90,
      progress: adherence,
    },
    {
      id: 'streak',
      title: '🔥 On a Roll',
      description: `${streak} consecutive days logging`,
      icon: '🔥',
      unlocked: streak >= 3,
      progress: Math.min((streak / 7) * 100, 100),
    },
    {
      id: 'consistent-logger',
      title: '📝 Consistent Logger',
      description: 'Log data for 7+ days',
      icon: '📝',
      unlocked: daysLogged >= 7,
      progress: Math.min((daysLogged / 7) * 100, 100),
    },
    {
      id: 'alert-free',
      title: '✅ Alert-Free Week',
      description: 'No alerts for 7 consecutive days',
      icon: '✅',
      unlocked: alertsFree,
      progress: alertsFree ? 100 : 50,
    },
    {
      id: 'health-champion',
      title: '🏆 Health Champion',
      description: 'Perfect adherence + No alerts',
      icon: '🏆',
      unlocked: adherence >= 90 && alertsFree,
      progress: adherence >= 90 && alertsFree ? 100 : Math.min(adherence / 2, 50),
    },
  ];

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">🏆 Achievements</h3>
        <div className="text-sm text-gray-600">
          {badges.filter((b) => b.unlocked).length} / {badges.length} unlocked
        </div>
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {badges.map((badge) => (
          <div
            key={badge.id}
            onClick={() => setSelectedBadge(selectedBadge === badge.id ? null : badge.id)}
            className={`p-3 rounded-lg text-center cursor-pointer transition-all ${
              badge.unlocked
                ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 shadow-md hover:shadow-lg'
                : 'bg-gray-50 border-2 border-gray-200 opacity-60'
            }`}
          >
            <div className="text-3xl mb-1">{badge.icon}</div>
            <div className="text-xs font-semibold text-gray-800 line-clamp-1">{badge.title.split(' ')[1]}</div>

            {/* Progress Bar */}
            <div className="mt-2 w-full bg-gray-300 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  badge.unlocked
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                    : 'bg-gray-400'
                }`}
                style={{ width: `${badge.progress}%` }}
              />
            </div>

            {badge.unlocked && <div className="text-xs text-yellow-700 font-bold mt-1">✓ Unlocked</div>}
          </div>
        ))}
      </div>

      {/* Badge Details */}
      {selectedBadge && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          {badges.map((badge) =>
            badge.id === selectedBadge ? (
              <div key={badge.id}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{badge.icon}</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">{badge.title}</h4>
                    <p className="text-sm text-gray-600">{badge.description}</p>
                  </div>
                </div>
                {!badge.unlocked && (
                  <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                    <div className="text-sm font-semibold text-gray-700 mb-2">Progress</div>
                    <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${badge.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{badge.progress.toFixed(0)}% complete</div>
                  </div>
                )}
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Total Progress */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">Overall Achievement Progress</span>
          <span className="text-sm font-bold text-yellow-600">
            {badges.filter((b) => b.unlocked).length} / {badges.length}
          </span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 transition-all"
            style={{
              width: `${(badges.filter((b) => b.unlocked).length / badges.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
