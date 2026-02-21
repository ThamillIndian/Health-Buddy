'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/app/utils/api';

interface TrendsChartProps {
  userId: string;
  days?: number;
}

export default function TrendsChart({ userId, days = 7 }: TrendsChartProps) {
  const [glucoseData, setGlucoseData] = useState<number[]>([]);
  const [bpData, setBpData] = useState<number[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const response = await apiClient.getDashboard(userId, days);
        const dashboard = response.data;

        // Generate mock data for visualization (in production, would come from API)
        const mockGlucose = [110, 115, 120, 118, 125, 122, 120];
        const mockBP = [120, 122, 125, 123, 128, 125, 124];
        const dayLabels = Array.from({ length: days }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (days - 1 - i));
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        setGlucoseData(mockGlucose);
        setBpData(mockBP);
        setLabels(dayLabels);
      } catch (error) {
        console.error('Failed to fetch trends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [userId, days]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <div className="text-center py-8">
          <p className="text-gray-600">Loading trends...</p>
        </div>
      </div>
    );
  }

  // Simple ASCII-based chart for browser compatibility
  const maxGlucose = Math.max(...glucoseData);
  const minGlucose = Math.min(...glucoseData);
  const rangeGlucose = maxGlucose - minGlucose || 1;

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 Health Trends (Last {days} Days)</h3>

      {/* Glucose Trend */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-amber-700">🩸 Glucose Level</h4>
          <span className="text-sm text-gray-600">
            Min: {minGlucose.toFixed(0)} | Max: {maxGlucose.toFixed(0)} | Avg:{' '}
            {(glucoseData.reduce((a, b) => a + b, 0) / glucoseData.length).toFixed(0)}
          </span>
        </div>

        <div className="flex items-end justify-around h-32 bg-gradient-to-t from-amber-50 to-transparent p-4 rounded border border-amber-100">
          {glucoseData.map((val, idx) => {
            const height = ((val - minGlucose) / rangeGlucose) * 100 + 10;
            return (
              <div
                key={idx}
                className="flex flex-col items-center"
                title={`Day ${idx + 1}: ${val} mg/dL`}
              >
                <div
                  className="bg-gradient-to-t from-amber-500 to-amber-300 rounded-t w-6 transition-all hover:from-amber-600 hover:to-amber-400"
                  style={{ height: `${height}%`, minHeight: '20px' }}
                />
                <span className="text-xs text-gray-600 mt-2">{labels[idx]?.split(' ')[1]}</span>
              </div>
            );
          })}
        </div>

        {/* Glucose Status */}
        <div className="mt-3 p-3 bg-amber-50 rounded border border-amber-200">
          <div className="flex items-center gap-2">
            {glucoseData[glucoseData.length - 1] < 130 ? (
              <>
                <span className="text-green-600 font-semibold">✅ Within Normal Range</span>
                <span className="text-sm text-gray-600">Latest: {glucoseData[glucoseData.length - 1]} mg/dL</span>
              </>
            ) : (
              <>
                <span className="text-orange-600 font-semibold">⚠️ Slightly Elevated</span>
                <span className="text-sm text-gray-600">Latest: {glucoseData[glucoseData.length - 1]} mg/dL</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Blood Pressure Trend */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-red-700">💓 Blood Pressure (Systolic)</h4>
          <span className="text-sm text-gray-600">
            Min: {Math.min(...bpData).toFixed(0)} | Max: {Math.max(...bpData).toFixed(0)}
          </span>
        </div>

        <div className="flex items-end justify-around h-32 bg-gradient-to-t from-red-50 to-transparent p-4 rounded border border-red-100">
          {bpData.map((val, idx) => {
            const minBP = Math.min(...bpData);
            const maxBP = Math.max(...bpData);
            const rangeBP = maxBP - minBP || 1;
            const height = ((val - minBP) / rangeBP) * 100 + 10;
            return (
              <div
                key={idx}
                className="flex flex-col items-center"
                title={`Day ${idx + 1}: ${val} mmHg`}
              >
                <div
                  className="bg-gradient-to-t from-red-500 to-red-300 rounded-t w-6 transition-all hover:from-red-600 hover:to-red-400"
                  style={{ height: `${height}%`, minHeight: '20px' }}
                />
                <span className="text-xs text-gray-600 mt-2">{labels[idx]?.split(' ')[1]}</span>
              </div>
            );
          })}
        </div>

        {/* BP Status */}
        <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
          <div className="flex items-center gap-2">
            {bpData[bpData.length - 1] < 130 ? (
              <>
                <span className="text-green-600 font-semibold">✅ Normal Range</span>
                <span className="text-sm text-gray-600">Latest: {bpData[bpData.length - 1]} mmHg</span>
              </>
            ) : (
              <>
                <span className="text-orange-600 font-semibold">⚠️ Elevated</span>
                <span className="text-sm text-gray-600">Latest: {bpData[bpData.length - 1]} mmHg</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-2">📊 Trend Analysis</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-blue-50 rounded border border-blue-200">
            <div className="text-sm text-gray-600">Glucose Trend</div>
            <div className="font-semibold text-blue-700">
              {glucoseData[glucoseData.length - 1] > glucoseData[0] ? '📈 Increasing' : '📉 Decreasing'}
            </div>
          </div>
          <div className="p-3 bg-purple-50 rounded border border-purple-200">
            <div className="text-sm text-gray-600">BP Trend</div>
            <div className="font-semibold text-purple-700">
              {bpData[bpData.length - 1] > bpData[0] ? '📈 Increasing' : '📉 Decreasing'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
