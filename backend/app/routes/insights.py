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

@router.get("/users/{user_id}/insights/daily-tip")
async def get_daily_tip(user_id: str, db: Session = Depends(get_db)):
    """Get personalized daily health tip using Qwen"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get today's metrics
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_events = db.query(Event).filter(
        Event.user_id == user_id,
        Event.timestamp >= today_start
    ).all()
    
    # Calculate adherence (simplified)
    med_events = [e for e in today_events if e.type == "medication"]
    adherence_pct = 100.0 if med_events else 50.0
    
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
    
    # Calculate metrics
    symptoms_count = len([e for e in events if e.type == "symptom"])
    med_events = [e for e in events if e.type == "medication"]
    adherence_pct = (len([m for m in med_events if m.payload.get("taken")]) / max(len(med_events), 1) * 100) if med_events else 0
    
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
