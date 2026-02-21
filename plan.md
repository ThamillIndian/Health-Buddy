# Chronic, Not Chaotic — Multilingual Daily Health Buddy
## Complete Problem Statement + Development Plan (Final Round)

---

## 1) Final Problem Statement

People living with chronic conditions (diabetes, hypertension, asthma, thyroid, heart issues, etc.) make daily health decisions outside clinics: taking medicines on time, interpreting readings, noticing warning signs, and knowing when to seek help. Existing support between doctor visits is weak—missed meds and unnoticed trends often become preventable emergencies.

The challenge is to build a simple, multilingual health buddy that works on everyday phones (including low-end devices), avoids long forms or jargon, supports quick daily logging, improves medication adherence, provides calm, clear guidance (not diagnosis), and generates a short doctor-friendly summary when needed.

---

## 2) Product Goals

Primary Goals:
1. Ultra-low friction daily logging (10–30 seconds)
2. Medication adherence support with realistic behavior (snooze, confirm, missed detection)
3. Explainable risk triage (Green / Amber / Red)
4. Doctor-ready summary export (7/14/30 days)
5. Multilingual + icon-first UI

Hackathon Goals:
- Demonstrate 3 real scenarios end-to-end
- Show modular agentic architecture
- Ensure explainability + safety

---

## 3) Core Features

- Vitals logging (BP, glucose, weight, breathing)
- Symptom logging (icon-based, 1–3 severity)
- Medication reminders + adherence tracking
- Risk triage using thresholds + trend detection
- Doctor report generation (PDF + share text)
- Offline-first PWA support

---

## 4) System Architecture

Client (PWA / Mobile Web)
→ FastAPI Backend
→ Postgres (Supabase)
→ Agent Services:
   - Normalization Agent
   - Adherence Agent
   - Risk/Triage Agent
   - Summary Agent

---

## 5) Agent Responsibilities

Normalization Agent:
- Converts voice/chat/icons into structured health events

Adherence Agent:
- Manages medication schedule
- Tracks adherence percentage
- Detects missed doses

Risk/Triage Agent:
- Applies threshold rules
- Detects trends (3-day / 7-day)
- Produces Green / Amber / Red with reason codes

Summary Agent:
- Aggregates stats
- Generates doctor-friendly report
- Exports PDF

---

## 6) Data Model

Tables:
- users
- condition_profiles
- medications
- events
- derived_daily
- alerts
- reports

Event Schema:
Event = {
  user_id,
  timestamp,
  type,
  payload,
  source,
  raw_text,
  lang,
  confidence
}

---

## 7) Risk Logic

RiskScore = 
  Threshold Breach +
  Trend Score +
  Symptom Severity +
  Missed Medication Weight +
  Personal Baseline Deviation

Mapping:
0–30 → Green
31–65 → Amber
66–100 → Red

---

## 8) Tech Stack

Frontend:
- Next.js (PWA)
- TypeScript
- Tailwind CSS
- IndexedDB for offline queue

Backend:
- FastAPI (Python)
- Postgres (Supabase)
- BackgroundTasks or Celery (optional)

AI (Safe Usage):
- LLM only for multilingual parsing + summary narration
- No diagnostic AI

---

## 9) API Endpoints

POST /users
POST /users/{id}/events
GET /users/{id}/status
POST /users/{id}/triage/run
POST /users/{id}/reports

---

## 10) Development Phases

Phase 1:
- Database schema
- Event logging API
- Quick log UI
- Basic triage logic

Phase 2:
- Medication schedule
- Adherence tracking
- Status engine

Phase 3:
- Doctor report generation
- PDF export
- Multilingual UI

Phase 4:
- Voice input normalization
- Final demo scenarios
- Testing + polish

---

## 11) Demo Scenarios

Scenario 1:
High BP + headache → Amber → recheck → persistent → Red

Scenario 2:
Missed meds + rising sugar → Amber escalation

Scenario 3:
Stable readings → Green + positive reinforcement

---

## 12) Safety

- Not a diagnostic tool
- Explainable rule-based triage
- Escalation suggests consulting a doctor
- Full event audit trail

---

End of plan.md
