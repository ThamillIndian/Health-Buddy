'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/app/utils/api';

interface TrendsChartProps {
  userId: string;
  days?: number;
}

export default function TrendsChart({ userId, days = 7 }: TrendsChartProps) {
  const [glucoseData, setGlucoseData] = useState<(number | null)[]>([]);
  const [bpData, setBpData] = useState<(number | null)[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        setLoading(true);
        
        // Fetch actual events from the API
        const eventsResponse = await apiClient.getEvents(userId, days);
        const events = eventsResponse.data;

        // Group vitals by date (YYYY-MM-DD)
        const dailyGlucose: { [key: string]: number } = {};
        const dailyBP: { [key: string]: number } = {};

        events.forEach((event: any) => {
          if (event.type === 'vital') {
            const eventDate = new Date(event.timestamp);
            const dateKey = eventDate.toISOString().split('T')[0];
            
            // Extract glucose value
            if (event.payload.glucose !== undefined && event.payload.glucose !== null) {
              const glucoseValue = typeof event.payload.glucose === 'number' 
                ? event.payload.glucose 
                : parseFloat(event.payload.glucose);
              if (!isNaN(glucoseValue) && glucoseValue > 0) {
                // Use the latest value for each day
                dailyGlucose[dateKey] = glucoseValue;
              }
            }
            
            // Extract BP systolic value
            if (event.payload.bp) {
              const bpStr = event.payload.bp.toString();
              const bpParts = bpStr.split('/');
              if (bpParts[0]) {
                const systolic = parseInt(bpParts[0].trim());
                if (!isNaN(systolic) && systolic > 0) {
                  // Use the latest value for each day
                  dailyBP[dateKey] = systolic;
                }
              }
            }
          }
        });

        // Create arrays for the last N days, filling with null for missing days
        const glucoseDataArray: (number | null)[] = [];
        const bpDataArray: (number | null)[] = [];
        const dayLabelsArray: string[] = [];

        for (let i = days - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateKey = d.toISOString().split('T')[0];
          const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const dayNumber = d.getDate();
          
          dayLabelsArray.push(dayLabel);
          glucoseDataArray.push(dailyGlucose[dateKey] || null);
          bpDataArray.push(dailyBP[dateKey] || null);
        }

        setGlucoseData(glucoseDataArray);
        setBpData(bpDataArray);
        setLabels(dayLabelsArray);
      } catch (error) {
        console.error('Failed to fetch trends:', error);
        // Set empty arrays on error
        setGlucoseData(Array(days).fill(null));
        setBpData(Array(days).fill(null));
        setLabels(Array.from({ length: days }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (days - 1 - i));
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }));
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

  // Calculate stats only from actual data (filter out null values)
  const validGlucoseData = glucoseData.filter((v): v is number => v !== null);
  const validBPData = bpData.filter((v): v is number => v !== null);

  const maxGlucose = validGlucoseData.length > 0 ? Math.max(...validGlucoseData) : 0;
  const minGlucose = validGlucoseData.length > 0 ? Math.min(...validGlucoseData) : 0;
  const rangeGlucose = maxGlucose - minGlucose || 1;
  const avgGlucose = validGlucoseData.length > 0 
    ? (validGlucoseData.reduce((a, b) => a + b, 0) / validGlucoseData.length).toFixed(0)
    : 'N/A';

  const maxBP = validBPData.length > 0 ? Math.max(...validBPData) : 0;
  const minBP = validBPData.length > 0 ? Math.min(...validBPData) : 0;
  const rangeBP = maxBP - minBP || 1;

  // Find latest values (most recent day with data, going backwards from the end)
  let latestGlucose: number | null = null;
  for (let i = glucoseData.length - 1; i >= 0; i--) {
    if (glucoseData[i] !== null) {
      latestGlucose = glucoseData[i];
      break;
    }
  }
  
  let latestBP: number | null = null;
  for (let i = bpData.length - 1; i >= 0; i--) {
    if (bpData[i] !== null) {
      latestBP = bpData[i];
      break;
    }
  }

  // Get day numbers for labels
  const getDayNumber = (label: string) => {
    const parts = label.split(' ');
    return parts.length > 1 ? parts[1] : '';
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 Health Trends (Last {days} Days)</h3>

      {/* Glucose Trend */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-amber-700">🩸 Glucose Level</h4>
          {validGlucoseData.length > 0 ? (
            <span className="text-sm text-gray-600">
              Min: {minGlucose.toFixed(0)} | Max: {maxGlucose.toFixed(0)} | Avg: {avgGlucose}
            </span>
          ) : (
            <span className="text-sm text-gray-400">No data available</span>
          )}
        </div>

        {/* Box-style visualization */}
        <div className="flex items-center justify-around gap-2 mb-3">
          {glucoseData.map((val, idx) => {
            const dayNum = getDayNumber(labels[idx] || '');
            const hasData = val !== null;
            
            // Calculate color intensity based on value (0-100%)
            let intensity = 0;
            if (hasData && rangeGlucose > 0) {
              intensity = ((val - minGlucose) / rangeGlucose) * 100;
              intensity = Math.max(20, Math.min(100, intensity)); // Clamp between 20-100%
            }
            
            return (
              <div
                key={idx}
                className="flex flex-col items-center"
                title={hasData ? `${labels[idx]}: ${val} mg/dL` : `${labels[idx]}: No data`}
              >
                <div
                  className={`w-12 h-12 rounded transition-all ${
                    hasData
                      ? 'border-2 border-amber-400 hover:shadow-lg cursor-pointer'
                      : 'bg-gray-100 border-2 border-gray-300 border-dashed opacity-50'
                  }`}
                  style={hasData ? {
                    background: `linear-gradient(135deg, 
                      rgba(251, 191, 36, ${0.3 + intensity / 200}), 
                      rgba(245, 158, 11, ${0.5 + intensity / 200}))`
                  } : {}}
                />
                <span className="text-xs text-gray-600 mt-2 font-medium">{dayNum}</span>
              </div>
            );
          })}
        </div>

        {/* Glucose Status */}
        <div className="mt-3 p-3 bg-amber-50 rounded border-l-4 border-green-500">
          <div className="flex items-center gap-2">
            {latestGlucose !== null ? (
              latestGlucose < 130 ? (
                <>
                  <span className="text-green-600 font-semibold">✅ Within Normal Range</span>
                  <span className="text-sm text-gray-600">Latest: {latestGlucose} mg/dL</span>
                </>
              ) : (
                <>
                  <span className="text-orange-600 font-semibold">⚠️ Slightly Elevated</span>
                  <span className="text-sm text-gray-600">Latest: {latestGlucose} mg/dL</span>
                </>
              )
            ) : (
              <span className="text-gray-500 text-sm">No glucose readings available</span>
            )}
          </div>
        </div>
      </div>

      {/* Blood Pressure Trend */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-red-700">💓 Blood Pressure (Systolic)</h4>
          {validBPData.length > 0 ? (
            <span className="text-sm text-gray-600">
              Min: {minBP.toFixed(0)} | Max: {maxBP.toFixed(0)}
            </span>
          ) : (
            <span className="text-sm text-gray-400">No data available</span>
          )}
        </div>

        {/* Box-style visualization */}
        <div className="flex items-center justify-around gap-2 mb-3">
          {bpData.map((val, idx) => {
            const dayNum = getDayNumber(labels[idx] || '');
            const hasData = val !== null;
            
            // Calculate color intensity based on value (0-100%)
            let intensity = 0;
            if (hasData && rangeBP > 0) {
              intensity = ((val - minBP) / rangeBP) * 100;
              intensity = Math.max(20, Math.min(100, intensity)); // Clamp between 20-100%
            }
            
            return (
              <div
                key={idx}
                className="flex flex-col items-center"
                title={hasData ? `${labels[idx]}: ${val} mmHg` : `${labels[idx]}: No data`}
              >
                <div
                  className={`w-12 h-12 rounded transition-all ${
                    hasData
                      ? 'border-2 border-red-400 hover:shadow-lg cursor-pointer'
                      : 'bg-gray-100 border-2 border-gray-300 border-dashed opacity-50'
                  }`}
                  style={hasData ? {
                    background: `linear-gradient(135deg, 
                      rgba(239, 68, 68, ${0.3 + intensity / 200}), 
                      rgba(220, 38, 38, ${0.5 + intensity / 200}))`
                  } : {}}
                />
                <span className="text-xs text-gray-600 mt-2 font-medium">{dayNum}</span>
              </div>
            );
          })}
        </div>

        {/* BP Status */}
        <div className="mt-3 p-3 bg-red-50 rounded border-l-4 border-green-500">
          <div className="flex items-center gap-2">
            {latestBP !== null ? (
              latestBP < 130 ? (
                <>
                  <span className="text-green-600 font-semibold">✅ Normal Range</span>
                  <span className="text-sm text-gray-600">Latest: {latestBP} mmHg</span>
                </>
              ) : (
                <>
                  <span className="text-orange-600 font-semibold">⚠️ Elevated</span>
                  <span className="text-sm text-gray-600">Latest: {latestBP} mmHg</span>
                </>
              )
            ) : (
              <span className="text-gray-500 text-sm">No blood pressure readings available</span>
            )}
          </div>
        </div>
      </div>

      {/* Trend Analysis */}
      {validGlucoseData.length > 1 || validBPData.length > 1 ? (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-2">📊 Trend Analysis</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <div className="text-sm text-gray-600">Glucose Trend</div>
              <div className="font-semibold text-blue-700">
                {validGlucoseData.length > 1 && latestGlucose !== null && validGlucoseData[0] !== null
                  ? (latestGlucose > validGlucoseData[0] ? '📈 Increasing' : '📉 Decreasing')
                  : '📊 Stable'}
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded border border-purple-200">
              <div className="text-sm text-gray-600">BP Trend</div>
              <div className="font-semibold text-purple-700">
                {validBPData.length > 1 && latestBP !== null && validBPData[0] !== null
                  ? (latestBP > validBPData[0] ? '📈 Increasing' : '📉 Decreasing')
                  : '📊 Stable'}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
