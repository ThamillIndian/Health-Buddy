/**
 * Mock data for demo purposes
 * Easy to toggle on/off by changing DEMO_MODE flag
 */

export const DEMO_MODE = true; // Set to false to use real API data

// Generate dates for last 30 days
const generateDates = (days: number) => {
  const dates = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date);
  }
  return dates;
};

const dates = generateDates(30);

// Mock Medications
export const mockMedications = [
  {
    id: '1',
    name: 'Amlodipine',
    strength: '5mg',
    category: 'Blood Pressure',
    frequency: 'Once daily',
    times: ['08:00'],
    active: true,
    notes: 'Take with breakfast',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    name: 'Metformin',
    strength: '500mg',
    category: 'Diabetes',
    frequency: 'Twice daily',
    times: ['08:00', '20:00'],
    active: true,
    notes: 'Take with meals',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    name: 'Atorvastatin',
    strength: '20mg',
    category: 'Cholesterol',
    frequency: 'Once daily',
    times: ['20:00'],
    active: true,
    notes: 'Take at bedtime',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    name: 'Aspirin',
    strength: '75mg',
    category: 'Blood Thinner',
    frequency: 'Once daily',
    times: ['08:00'],
    active: true,
    notes: 'Take after breakfast',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock Health Events (BP, Glucose, Weight)
export const mockHealthEvents = dates.flatMap((date, dayIndex) => {
  const events = [];
  const trendFactor = dayIndex / dates.length; // Improvement over time
  
  // Morning BP
  const systolic = Math.floor(135 - (10 * trendFactor) + (Math.random() * 16 - 8));
  const diastolic = Math.floor(85 + (Math.random() * 10 - 5));
  
  const morningTime = new Date(date);
  morningTime.setHours(8, 0, 0, 0);
  
  events.push({
    id: `bp-morning-${dayIndex}`,
    timestamp: morningTime.toISOString(),
    type: 'blood_pressure',
    payload: { systolic, diastolic, unit: 'mmHg' },
    source: 'manual'
  });
  
  // Morning Glucose
  const glucose = Math.floor(110 - (15 * trendFactor) + (Math.random() * 25 - 10));
  
  const glucoseTime = new Date(date);
  glucoseTime.setHours(8, 30, 0, 0);
  
  events.push({
    id: `glucose-morning-${dayIndex}`,
    timestamp: glucoseTime.toISOString(),
    type: 'blood_glucose',
    payload: { value: glucose, unit: 'mg/dL', context: 'fasting' },
    source: 'manual'
  });
  
  // Evening BP
  const systolicEve = Math.floor(135 - (10 * trendFactor) + (Math.random() * 15 - 5));
  const diastolicEve = Math.floor(85 + (Math.random() * 14 - 3));
  
  const eveningTime = new Date(date);
  eveningTime.setHours(20, 0, 0, 0);
  
  events.push({
    id: `bp-evening-${dayIndex}`,
    timestamp: eveningTime.toISOString(),
    type: 'blood_pressure',
    payload: { systolic: systolicEve, diastolic: diastolicEve, unit: 'mmHg' },
    source: 'manual'
  });
  
  // Weight (every 3 days)
  if (dayIndex % 3 === 0) {
    const weight = 75 + (Math.random() * 1 - 0.5);
    
    const weightTime = new Date(date);
    weightTime.setHours(7, 30, 0, 0);
    
    events.push({
      id: `weight-${dayIndex}`,
      timestamp: weightTime.toISOString(),
      type: 'weight',
      payload: { value: parseFloat(weight.toFixed(1)), unit: 'kg' },
      source: 'manual'
    });
  }
  
  // Random symptoms (20% of days)
  if (Math.random() < 0.2) {
    const symptomOptions = [
      ['headache', 'fatigue'],
      ['dizziness'],
      ['nausea'],
      ['fatigue', 'weakness'],
      ['chest_discomfort']
    ];
    
    const symptomTime = new Date(date);
    symptomTime.setHours(Math.floor(Math.random() * 8) + 10, Math.floor(Math.random() * 60), 0, 0);
    
    events.push({
      id: `symptom-${dayIndex}`,
      timestamp: symptomTime.toISOString(),
      type: 'symptom',
      payload: {
        symptoms: symptomOptions[Math.floor(Math.random() * symptomOptions.length)],
        severity: Math.random() < 0.7 ? 'mild' : 'moderate'
      },
      source: 'manual'
    });
  }
  
  return events;
});

// Mock Dashboard Data
export const mockDashboardData = {
  adherence: {
    rate: 87.5,
    trend: '+5.2%',
    weekly: [85, 88, 86, 89, 87, 88, 90]
  },
  bloodPressure: {
    latest: { systolic: 128, diastolic: 82 },
    trend: 'improving',
    data: dates.map((date, i) => ({
      date: date.toISOString().split('T')[0],
      systolic: Math.floor(135 - (10 * i / dates.length) + (Math.random() * 16 - 8)),
      diastolic: Math.floor(85 + (Math.random() * 10 - 5))
    }))
  },
  glucose: {
    latest: 98,
    trend: 'improving',
    data: dates.map((date, i) => ({
      date: date.toISOString().split('T')[0],
      value: Math.floor(110 - (15 * i / dates.length) + (Math.random() * 25 - 10))
    }))
  },
  weight: {
    latest: 74.8,
    change: '-0.5 kg',
    data: dates.filter((_, i) => i % 3 === 0).map((date, i) => ({
      date: date.toISOString().split('T')[0],
      value: parseFloat((75 + (Math.random() * 1 - 0.5)).toFixed(1))
    }))
  },
  alerts: [
    {
      id: '1',
      level: 'warning',
      message: 'Blood pressure slightly elevated this morning',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      dismissed: false
    },
    {
      id: '2',
      level: 'info',
      message: 'Great medication adherence this week!',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      dismissed: false
    }
  ],
  recentActivity: [
    {
      type: 'medication',
      message: 'Took Amlodipine 5mg',
      time: '2 hours ago'
    },
    {
      type: 'vital',
      message: 'Logged blood pressure: 128/82',
      time: '3 hours ago'
    },
    {
      type: 'vital',
      message: 'Logged blood glucose: 98 mg/dL',
      time: '3 hours ago'
    }
  ]
};

// Mock Adherence Logs
export const mockAdherenceLogs = mockMedications.flatMap(med =>
  dates.flatMap(date =>
    med.times.map((time, timeIndex) => {
      const [hour, minute] = time.split(':').map(Number);
      const scheduledTime = new Date(date);
      scheduledTime.setHours(hour, minute, 0, 0);
      
      const wasTaken = Math.random() < 0.87; // 87% adherence
      
      const takenTime = wasTaken
        ? new Date(scheduledTime.getTime() + (Math.random() * 30 - 15) * 60 * 1000)
        : null;
      
      return {
        id: `adherence-${med.id}-${date.toISOString()}-${timeIndex}`,
        med_id: med.id,
        medication_name: med.name,
        scheduled_time: scheduledTime.toISOString(),
        taken_time: takenTime?.toISOString() || null,
        status: wasTaken ? 'taken' : (Math.random() < 0.5 ? 'missed' : 'skipped')
      };
    })
  )
);

// Mock Alerts
export const mockAlerts = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    level: 'warning',
    score: 0.75,
    reason_codes: ['high_blood_pressure'],
    message: 'Blood pressure reading of 142/88 mmHg detected',
    dismissed: false
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    level: 'info',
    score: 0.3,
    reason_codes: ['adherence_milestone'],
    message: 'Excellent adherence: 90% for the past week!',
    dismissed: false
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    level: 'warning',
    score: 0.65,
    reason_codes: ['high_glucose'],
    message: 'Fasting glucose of 132 mg/dL is above target',
    dismissed: true
  }
];
