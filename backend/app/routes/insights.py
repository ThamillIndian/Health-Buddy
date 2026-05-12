"""
AI-powered insights routes using Qwen
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.database import get_db
from app.models import User, Event, Alert
from app.services.qwen_service import QwenService

router = APIRouter()
qwen_service = QwenService()

# Demo mode flag - set to True to use mock AI responses (bypasses database)
DEMO_MODE = True

@router.get("/users/{user_id}/insights/daily-tip")
async def get_daily_tip(user_id: str, db: Session = Depends(get_db)):
    """Get personalized daily health tip using Qwen"""
    
    # Demo mode: return mock AI response without database queries
    if DEMO_MODE:
        return {
            "tip": "🌟 Excellent progress! Your medication adherence is at 87.5% - that's fantastic! Your blood pressure readings show consistent improvement, trending from 135/88 to 128/82 mmHg over the past week. Keep taking your morning medications on time, especially your Amlodipine. Your glucose levels are stable at 98 mg/dL, which is within the healthy range. Pro tip: Try to maintain consistent meal times to help regulate your blood sugar even better!",
            "generated_at": datetime.utcnow(),
            "metrics": {
                "adherence_pct": 87.5,
                "avg_glucose": 98,
                "avg_bp": "128/82"
            }
        }
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get today's metrics
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_events = db.query(Event).filter(
        Event.user_id == user_id,
        Event.timestamp >= today_start
    ).all()
    
    # Calculate real adherence from today's medication events
    med_events = [e for e in today_events if e.type == "medication"]
    if med_events:
        taken_events = len([e for e in med_events if e.payload.get("action") == "taken"])
        adherence_pct = (taken_events / len(med_events) * 100) if med_events else 0.0
    else:
        # If no events today, check last 7 days for overall adherence
        from datetime import timedelta
        week_start = datetime.utcnow() - timedelta(days=7)
        week_events = db.query(Event).filter(
            Event.user_id == user_id,
            Event.type == "medication",
            Event.timestamp >= week_start
        ).all()
        if week_events:
            taken_week = len([e for e in week_events if e.payload.get("action") == "taken"])
            adherence_pct = (taken_week / len(week_events) * 100) if week_events else 0.0
        else:
            adherence_pct = 0.0
    
    # Get latest glucose if available
    avg_glucose = None
    vital_events = [e for e in today_events if e.type == "vital" and "glucose" in e.payload]
    if vital_events:
        avg_glucose = vital_events[-1].payload.get("glucose")
    
    # Get latest BP if available
    avg_bp = None
    bp_events = [e for e in today_events if e.type == "vital" and "bp" in e.payload]
    if bp_events:
        avg_bp = bp_events[-1].payload.get("bp")
    
    tip = qwen_service.generate_daily_tip(user.name, adherence_pct, avg_glucose, avg_bp)
    
    return {
        "tip": tip,
        "generated_at": datetime.utcnow(),
        "metrics": {
            "adherence_pct": adherence_pct,
            "avg_glucose": avg_glucose,
            "avg_bp": avg_bp
        }
    }

@router.get("/users/{user_id}/insights/alert-explanation/{alert_id}")
async def get_alert_explanation(user_id: str, alert_id: str, db: Session = Depends(get_db)):
    """Get AI explanation of why an alert was triggered"""
    
    # Demo mode: return mock alert explanation
    if DEMO_MODE:
        return {
            "alert_id": alert_id,
            "level": "warning",
            "score": 0.75,
            "explanation": "⚠️ This alert was triggered because your blood pressure reading of 142/88 mmHg is above the normal range (target: <130/80 mmHg for most adults). Elevated blood pressure over time can increase the risk of heart disease and stroke. Consider: 1) Reducing salt intake in your diet, 2) Regular physical activity (30 minutes daily), 3) Stress management techniques, 4) Continue taking your blood pressure medication as prescribed. Monitor your BP daily and consult your doctor if readings remain consistently high.",
            "original_reasons": ["high_blood_pressure", "systolic_above_threshold"]
        }
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == user_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    explanation = qwen_service.explain_alert(alert.level, alert.reason_codes, alert.score)
    
    return {
        "alert_id": alert_id,
        "level": alert.level,
        "score": alert.score,
        "explanation": explanation,
        "original_reasons": alert.reason_codes
    }

@router.get("/users/{user_id}/insights/doctor-summary")
async def get_doctor_summary(user_id: str, days: int = 7, db: Session = Depends(get_db)):
    """Get AI-powered doctor-ready summary"""
    
    # Demo mode: return comprehensive mock health summary
    if DEMO_MODE:
        return {
            "user_id": user_id,
            "period_days": days,
            "summary": "📋 **Patient Health Summary (7-Day Period)**\n\n**Medication Adherence:** Excellent compliance demonstrated with 87.5% adherence rate. Patient consistently taking prescribed medications:\n- Amlodipine 5mg (blood pressure)\n- Metformin 500mg twice daily (diabetes)\n- Atorvastatin 20mg (cholesterol)\n- Aspirin 75mg (blood thinner)\n\n**Vital Signs Trends:**\n- Blood Pressure: Showing positive trend, improving from 135/88 to 128/82 mmHg. Within acceptable range.\n- Blood Glucose: Fasting levels stable at 98-102 mg/dL. Well-controlled.\n- Weight: Stable at 74.8 kg.\n\n**Symptoms Reported:** 1 mild headache episode 2 days ago, self-resolved without intervention. No concerning patterns.\n\n**Risk Assessment:** GREEN - Overall health trajectory is positive. Patient responding well to current treatment regimen.\n\n**Recommendations:**\n1. Continue current medication regimen\n2. Maintain regular BP and glucose monitoring\n3. Encourage continued adherence\n4. Follow-up in 2 weeks for routine check",
            "metrics": {
                "adherence_pct": 87.5,
                "symptoms_count": 1,
                "risk_level": "green",
                "alerts_count": 0
            }
        }
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get events from last N days
    since = datetime.utcnow() - timedelta(days=days)
    events = db.query(Event).filter(
        Event.user_id == user_id,
        Event.timestamp >= since
    ).all()
    
    # Get alerts
    alerts = db.query(Alert).filter(
        Alert.user_id == user_id,
        Alert.timestamp >= since
    ).all()
    
    # Calculate metrics from real data
    symptoms_count = len([e for e in events if e.type == "symptom"])
    med_events = [e for e in events if e.type == "medication"]
    
    # Calculate real adherence - check for "action" == "taken"
    if med_events:
        taken_events = len([m for m in med_events if m.payload.get("action") == "taken"])
        adherence_pct = (taken_events / len(med_events) * 100) if med_events else 0.0
    else:
        # Try to get from AdherenceLog if no medication events
        from app.models import AdherenceLog
        adherence_logs = db.query(AdherenceLog).filter(
            AdherenceLog.user_id == user_id,
            AdherenceLog.created_at >= since
        ).all()
        if adherence_logs:
            taken_logs = len([log for log in adherence_logs if log.status == "taken"])
            adherence_pct = (taken_logs / len(adherence_logs) * 100) if adherence_logs else 0.0
        else:
            adherence_pct = 0.0
    
    # Get max risk level
    risk_level = "green"
    if alerts:
        levels = [a.level for a in alerts]
        if "red" in levels:
            risk_level = "red"
        elif "amber" in levels:
            risk_level = "amber"
    
    summary = qwen_service.generate_doctor_summary(user.name, adherence_pct, symptoms_count, risk_level, days)
    
    return {
        "user_id": user_id,
        "period_days": days,
        "summary": summary,
        "metrics": {
            "adherence_pct": adherence_pct,
            "symptoms_count": symptoms_count,
            "risk_level": risk_level,
            "alerts_count": len(alerts)
        }
    }
