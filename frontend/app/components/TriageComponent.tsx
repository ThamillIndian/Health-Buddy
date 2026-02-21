'use client';

import { useState } from 'react';
import { apiClient } from '@/app/utils/api';

interface TriageProps {
  userId: string;
}

interface TriageResult {
  score: number;
  level: string;
  reasons: string[];
  timestamp: string;
}

export default function TriageComponent({ userId }: TriageProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [error, setError] = useState('');

  const runTriage = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.runTriage(userId);
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to run triage assessment');
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    if (level === 'red') return 'bg-red-100 border-red-300 text-red-800';
    if (level === 'amber') return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    return 'bg-green-100 border-green-300 text-green-800';
  };

  const getLevelEmoji = (level: string) => {
    if (level === 'red') return '🚨';
    if (level === 'amber') return '⚠️';
    return '✅';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <h3 className="font-bold text-lg text-gray-800 mb-4">🏥 Run Health Assessment</h3>
      
      <button
        onClick={runTriage}
        disabled={loading}
        className="w-full bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
      >
        {loading ? '⏳ Analyzing...' : '🔍 Run Triage Assessment'}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          {/* Risk Level */}
          <div className={`p-4 rounded-lg border-2 ${getLevelColor(result.level)}`}>
            <div className="flex items-center justify-between">
              <span className="text-2xl">{getLevelEmoji(result.level)}</span>
              <div className="text-right">
                <p className="font-bold text-lg">{result.level.toUpperCase()}</p>
                <p className="text-sm opacity-75">Risk Score: {Math.round(result.score)}/100</p>
              </div>
            </div>
          </div>

          {/* Risk Score Progress */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Risk Score</span>
              <span className="text-sm font-bold text-gray-800">{Math.round(result.score)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  result.score <= 30 ? 'bg-green-500' :
                  result.score <= 65 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(result.score, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Reasons */}
          {result.reasons && result.reasons.length > 0 && (
            <div>
              <p className="font-semibold text-gray-800 mb-2">📋 Assessment Reasons:</p>
              <ul className="space-y-2">
                {result.reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-lg">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timestamp */}
          <p className="text-xs text-gray-400 mt-4">
            Assessment at {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
