export const MEDICATIONS = [
  // Diabetes
  { id: "metformin_500", name: "Metformin 500mg", category: "diabetes", icon: "📊" },
  { id: "insulin_nph", name: "Insulin NPH", category: "diabetes", icon: "💉" },
  { id: "glibenclamide_5", name: "Glibenclamide 5mg", category: "diabetes", icon: "📊" },
  { id: "sitagliptin_100", name: "Sitagliptin 100mg", category: "diabetes", icon: "📊" },
  { id: "vildagliptin_50", name: "Vildagliptin 50mg", category: "diabetes", icon: "📊" },

  // Hypertension
  { id: "amlodipine_5", name: "Amlodipine 5mg", category: "hypertension", icon: "❤️" },
  { id: "lisinopril_10", name: "Lisinopril 10mg", category: "hypertension", icon: "❤️" },
  { id: "losartan_50", name: "Losartan 50mg", category: "hypertension", icon: "❤️" },
  { id: "atenolol_50", name: "Atenolol 50mg", category: "hypertension", icon: "❤️" },

  // Asthma
  { id: "salbutamol_inhaler", name: "Salbutamol Inhaler", category: "asthma", icon: "🫁" },
  { id: "budesonide_inhaler", name: "Budesonide Inhaler", category: "asthma", icon: "🫁" },
  { id: "montelukast_10", name: "Montelukast 10mg", category: "asthma", icon: "🫁" },

  // Thyroid
  { id: "levothyroxine_50", name: "Levothyroxine 50mcg", category: "thyroid", icon: "🦴" },
  { id: "levothyroxine_100", name: "Levothyroxine 100mcg", category: "thyroid", icon: "🦴" },

  // Supplements
  { id: "vitamin_b12_1000", name: "Vitamin B12 1000mcg", category: "supplement", icon: "💊" },
  { id: "vitamin_d3_1000", name: "Vitamin D3 1000 IU", category: "supplement", icon: "☀️" },
  { id: "calcium_500", name: "Calcium 500mg", category: "supplement", icon: "🦴" },
];

export const SYMPTOMS = [
  { name: "Headache", severity: 2, icon: "🤕" },
  { name: "Fever", severity: 3, icon: "🤒" },
  { name: "Fatigue", severity: 2, icon: "😴" },
  { name: "Nausea", severity: 2, icon: "🤢" },
  { name: "Dizziness", severity: 2, icon: "😵" },
  { name: "Chest Pain", severity: 3, icon: "🫀" },
  { name: "Shortness of Breath", severity: 3, icon: "😤" },
  { name: "Joint Pain", severity: 1, icon: "🦴" },
  { name: "Muscle Pain", severity: 1, icon: "💪" },
  { name: "Cough", severity: 2, icon: "🤧" },
];

export const STATUS_COLORS = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export const STATUS_MESSAGES = {
  green: "✅ All Good! Keep it up!",
  amber: "⚠️ Something to monitor",
  red: "🚨 Please consult your doctor",
};

// Critical symptoms that require immediate attention (severity 3)
export const CRITICAL_SYMPTOMS = [
  "Chest Pain",
  "Shortness of Breath",
  "Severe Headache",
  "Severe Dizziness",
  "Loss of Consciousness",
  "Severe Abdominal Pain",
];

// Action recommendations for critical symptoms
export const CRITICAL_SYMPTOM_RECOMMENDATIONS: { [key: string]: string } = {
  "Chest Pain": "Chest pain can be a sign of a serious condition. Seek immediate medical attention. If severe or accompanied by shortness of breath, call emergency services immediately.",
  "Shortness of Breath": "Difficulty breathing requires immediate medical attention. If severe, call emergency services. Sit upright and try to remain calm while seeking help.",
  "Severe Headache": "Severe headaches, especially sudden onset, may require immediate medical evaluation. If accompanied by vision changes, confusion, or neck stiffness, seek emergency care.",
  "Severe Dizziness": "Severe dizziness with loss of balance or fainting requires immediate medical attention. Sit or lie down to prevent falls and seek help.",
  "Loss of Consciousness": "Loss of consciousness is a medical emergency. Call emergency services immediately and ensure the person is in a safe position.",
  "Severe Abdominal Pain": "Severe abdominal pain may indicate a serious condition. Seek immediate medical attention, especially if accompanied by fever, vomiting, or inability to move.",
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
