# Chronic Health Buddy - Complete Setup Guide

## 🏴‍☠️ Project Overview

**Chronic, Not Chaotic** is a multilingual daily health buddy app for people with chronic conditions (diabetes, hypertension, asthma, thyroid, heart issues, etc.).

### Key Features
- ✅ Ultra-low friction daily logging (10-30 seconds)
- ✅ Medication adherence tracking
- ✅ Risk triage (Green/Amber/Red alerts)
- ✅ Doctor-friendly reports (PDF export)
- ✅ Indian language support (via Sarvam AI)
- ✅ Voice input with intelligent parsing
- ✅ Qwen AI polish for better UX

---

## 📁 Project Structure

```
E:\nxtgen\Project/
├── backend/
│   ├── requirements.txt          # Python dependencies
│   ├── medications_seed.json     # 50+ medication database
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app
│   │   ├── database.py          # DB config
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── routes/
│   │   │   ├── users.py         # User management
│   │   │   ├── events.py        # Event logging + dashboard
│   │   │   ├── triage.py        # Risk assessment
│   │   │   └── reports.py       # PDF generation
│   │   └── services/
│   │       ├── triage_engine.py # Risk scoring logic
│   │       ├── normalization.py # Voice parsing
│   │       └── qwen_helper.py   # LLM integration
│   │
└── frontend/
    ├── package.json             # npm dependencies
    ├── next.config.js           # Next.js config
    ├── tailwind.config.js       # Tailwind CSS
    ├── app/
    │   ├── layout.tsx           # Root layout
    │   ├── page.tsx             # Signup/login
    │   ├── globals.css          # Global styles
    │   ├── components/
    │   │   ├── QuickLog.tsx      # Event logging UI
    │   │   ├── Dashboard.tsx     # 7-day summary
    │   │   └── AppContainer.tsx  # Main layout
    │   ├── utils/
    │   │   ├── api.ts           # API client
    │   │   └── constants.ts     # Shared data
    │   └── hooks/
    │       └── useHealthData.ts  # Data fetching
```

---

## 🚀 PHASE 1: Setup Status ✅ COMPLETED

### What's Done:

#### Backend
- ✅ Python virtual environment ready (create with: `python -m venv backend/venv`)
- ✅ All dependencies listed in `requirements.txt`
- ✅ Complete project structure created
- ✅ Database config with SQLite support
- ✅ 50+ medications seeded in JSON

#### Frontend
- ✅ Next.js project initialized
- ✅ Tailwind CSS configured
- ✅ All dependencies in `package.json`
- ✅ Component structure ready

### Next Steps:
1. Activate Python venv: `backend\venv\Scripts\activate`
2. Install dependencies: `pip install -r requirements.txt`
3. Run backend: `python -m uvicorn app.main:app --reload`
4. In another terminal, run frontend: `npm run dev`

---

## 🗄️ PHASE 2: Database & Models ✅ CREATED

### Database Tables:
- `users` - Patient profiles
- `condition_profiles` - Health conditions + thresholds
- `medications` - Medication library
- `events` - Health events (vitals, symptoms, meds)
- `adherence_log` - Med adherence tracking
- `alerts` - Green/Amber/Red alerts
- `derived_daily` - Daily aggregated stats
- `reports` - Generated PDF reports

### ORM Models:
- ✅ User, ConditionProfile, Medication
- ✅ Event, AdherenceLog, Alert
- ✅ DerivedDaily, Report
- ✅ All relationships configured with cascade delete

### Pydantic Schemas:
- ✅ UserCreate, UserResponse
- ✅ EventCreate, EventResponse
- ✅ TriageResult, AlertResponse
- ✅ DashboardResponse, ReportResponse

---

## 🔌 PHASE 3: Backend APIs ✅ CREATED

### Endpoints Implemented:

#### User Management
```
POST   /api/users                       # Create user + condition
GET    /api/users/{user_id}            # Get profile
PUT    /api/users/{user_id}            # Update profile
```

#### Event Logging
```
POST   /api/users/{user_id}/events             # Log event (vital/symptom/med)
GET    /api/users/{user_id}/events            # Get recent events
GET    /api/users/{user_id}/dashboard         # 7-day summary
```

#### Triage & Status
```
POST   /api/users/{user_id}/triage/run        # Run risk assessment
GET    /api/users/{user_id}/status            # Get current status
```

#### Reports
```
POST   /api/users/{user_id}/reports           # Generate PDF report
GET    /api/reports/{report_id}/download      # Download PDF
```

### Core Services:

#### Triage Engine
```python
# Calculates risk score (0-100) based on:
- Threshold breach detection (BP, glucose)
- 7-day trend analysis
- Symptom severity
- Missed medication tracking
- Baseline deviation

# Returns: score, level (green/amber/red), reasons
```

#### Normalization Agent
```python
# Parses voice/text into structured events
# Supports: Hindi, English, Tamil (extensible)
# Patterns for: BP, glucose, weight, symptoms, medications
```

#### Qwen Helper
```python
# Integrates with local LM Studio
# Features: Summary generation, alert explanations, tips
# Fallback: Basic text if Qwen unavailable
```

---

## 🎨 PHASE 4: Frontend UI ✅ CREATED

### Components:

#### QuickLog (`QuickLog.tsx`)
- 4 quick-action buttons (Med, Vitals, Symptoms, Voice)
- Forms for each type
- Real-time validation
- Success/error messages

#### Dashboard (`Dashboard.tsx`)
- Current status badge (Green/Amber/Red)
- Key metrics (adherence %, BP, glucose)
- 7-day trends
- Recent alerts list
- PDF download button

#### AppContainer (`AppContainer.tsx`)
- Tab navigation (Log, Dashboard, Settings)
- Responsive layout
- Mobile-first design

### Features:
- ✅ User signup/login
- ✅ Event logging with instant feedback
- ✅ Real-time dashboard updates
- ✅ PDF report generation
- ✅ Responsive design (mobile + desktop)
- ✅ Color-coded alerts (green/amber/red)

---

## 🎤 PHASE 5: Voice & Normalization ✅ PARTIALLY DONE

### What's Ready:
- ✅ Normalization engine (regex-based)
- ✅ Pattern matching for BP, glucose, weight, symptoms, meds
- ✅ Support for Hindi + English patterns
- ✅ Severity detection

### TODO:
- [ ] Frontend voice recording component
- [ ] Sarvam API integration (speech-to-text)
- [ ] Real-time audio streaming

---

## 📄 PHASE 6: PDF Generation ✅ CREATED

### Features:
- ✅ Report generation with ReportLab
- ✅ Patient info section
- ✅ Event summary statistics
- ✅ Alerts listing
- ✅ Doctor recommendations
- ✅ Frontend download button

---

## ✨ PHASE 7: Qwen Polish ✅ PARTIALLY DONE

### What's Ready:
- ✅ Qwen helper service created
- ✅ Doctor summary generation
- ✅ Alert explanations
- ✅ Daily health tips
- ✅ Med reminders
- ✅ Achievement messages

### TODO:
- [ ] Integrate Qwen calls into API endpoints
- [ ] Add to dashboard display
- [ ] Test with local LM Studio

---

## 🧪 PHASE 8: Demo Scenarios (Pending)

### Scenario 1: High BP Escalation
```
Day 1: BP 140/90 → GREEN
Day 2: BP 145/92 → GREEN
Day 3: BP 155/98 → AMBER (threshold breach)
Verify: Alert generated, PDF includes history
```

### Scenario 2: Missed Meds + Rising Sugar
```
Day 1: Took metformin, glucose 110 → GREEN
Day 2: MISSED metformin, glucose 145 → AMBER
Day 3: MISSED metformin, glucose 160 → RED
Verify: Adherence % drops, alert explains context
```

### Scenario 3: Good Adherence
```
7 days: All meds on time, vitals normal
Result: GREEN status, positive reinforcement
Verify: Encouragement message in dashboard
```

---

## 🎯 PHASE 9: Final Polish (Pending)

- [ ] Error handling + validation
- [ ] Loading states & animations
- [ ] Accessibility improvements
- [ ] Performance optimization
- [ ] Demo script preparation

---

## ⚙️ How to Run (ONE DAY SPRINT)

### 1. Setup Backend

```bash
cd E:\nxtgen\Project\backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
python -m uvicorn app.main:app --reload
```

Backend will be available at: `http://localhost:8000`

### 2. Setup Frontend

```bash
cd E:\nxtgen\Project\frontend

# Install dependencies
npm install

# Set environment (create .env.local if needed)
# NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Run dev server
npm run dev
```

Frontend will be available at: `http://localhost:3000`

### 3. Test the App

1. Go to `http://localhost:3000`
2. Fill signup form (Name, Email, Condition)
3. Click "Get Started"
4. Use the Quick Log to:
   - Add medication intake
   - Log blood pressure (e.g., "140/90")
   - Log glucose (e.g., "120")
   - Log symptoms
5. Switch to Dashboard tab
6. Download PDF report

---

## 🔧 Configuration

### Backend (.env)
```
DATABASE_URL=sqlite:///./chronic_health.db
QWEN_API_URL=http://localhost:1234/v1
ENABLE_QWEN=True
ENABLE_VOICE=True
DEBUG=True
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 📊 Database Initialization

Database tables are auto-created on first backend startup.

To seed medications:
```python
# In backend, run after starting app:
from app.models import Medication
import json

with open('medications_seed.json') as f:
    meds = json.load(f)
    # ... insert into DB
```

---

## 🚦 Testing Checklist

- [ ] Backend health check: `curl http://localhost:8000/health`
- [ ] Create user via API
- [ ] Log event (vital)
- [ ] Check dashboard
- [ ] Generate PDF report
- [ ] Test risk triage
- [ ] Run demo scenarios

---

## 📝 Notes for Development

1. **Database**: Uses SQLite by default (no setup needed). Switch to PostgreSQL in `.env`
2. **Qwen**: Requires LM Studio running on `localhost:1234`
3. **Sarvam**: Optional, add API key to `.env` to enable voice
4. **PDF**: Generated on-the-fly, no file persistence needed for MVP

---

## 🏴‍☠️ Ready to Hoist Anchor!

All Phase 1-4 are complete. You now have:
- ✅ Full backend API
- ✅ Database models
- ✅ Frontend UI
- ✅ Event logging
- ✅ Dashboard
- ✅ PDF generation

**Next step:** Activate venv, install dependencies, and run both servers!

Questions? Check the code comments in each file—they're comprehensive! ⚓

