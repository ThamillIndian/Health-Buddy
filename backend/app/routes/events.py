"""
Event logging routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
from app.database import get_db
from app.models import Event, User
from app.schemas import EventCreate, EventResponse, DashboardResponse, DashboardMetric
from app.services.triage_engine import TriageEngine
import uuid

router = APIRouter()
triage_engine = TriageEngine()

@router.post("/users/{user_id}/events", response_model=EventResponse)
async def log_event(user_id: str, event_data: EventCreate, db: Session = Depends(get_db)):
    """Log a new health event (vital, symptom, medication, note)"""
    
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    event = Event(
        id=str(uuid.uuid4()),
        user_id=user_id,
        timestamp=datetime.utcnow(),
        type=event_data.type,
        payload=event_data.payload,
        source=event_data.source,
        raw_text=event_data.raw_text,
        language=event_data.language,
        confidence=event_data.confidence
    )
    
    db.add(event)
    db.commit()
    db.refresh(event)
    
    # Run triage after event logged (now returns score, level, reasons, sources)
    score, level, reasons, sources = triage_engine.calculate_risk_score(user_id, db)
    triage_engine.generate_alert(user_id, score, level, reasons, event.id, db)
    
    return event

@router.get("/users/{user_id}/events", response_model=List[EventResponse])
async def get_events(user_id: str, days: int = 7, db: Session = Depends(get_db)):
    """Get recent events for user"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    since = datetime.utcnow() - timedelta(days=days)
    events = db.query(Event).filter(
        Event.user_id == user_id,
        Event.timestamp >= since
    ).order_by(Event.timestamp.desc()).all()
    
    return events

@router.get("/users/{user_id}/dashboard", response_model=DashboardResponse)
async def get_dashboard(user_id: str, days: int = 7, db: Session = Depends(get_db)):
    """Get dashboard with 7-day summary"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get current risk level (now returns score, level, reasons, sources)
    score, level, reasons, sources = triage_engine.calculate_risk_score(user_id, db)
    
    # Get events from last N days
    since = datetime.utcnow() - timedelta(days=days)
    events = db.query(Event).filter(
        Event.user_id == user_id,
        Event.timestamp >= since
    ).all()
    
    # Calculate metrics
    vitals = [e for e in events if e.type == "vital"]
    symptoms = [e for e in events if e.type == "symptom"]
    
    avg_bp = "N/A"
    bp_readings = []
    avg_glucose = None
    glucose_readings = []
    
    for event in vitals:
        payload = event.payload
        
        # Check for BP (either via vital_type or direct bp field)
        if payload.get("bp"):
            bp_readings.append(payload.get("bp", ""))
        elif payload.get("vital_type") == "bp":
            bp_readings.append(payload.get("bp", ""))
        
        # Check for glucose (directly in payload, no vital_type needed)
        if payload.get("glucose") is not None:
            glucose_value = payload.get("glucose")
            # Handle both int and float, and ensure it's a valid number
            if isinstance(glucose_value, (int, float)) and glucose_value > 0:
                glucose_readings.append(float(glucose_value))
    
    if bp_readings:
        avg_bp = bp_readings[-1]  # Latest reading
    
    if glucose_readings:
        avg_glucose = sum(glucose_readings) / len(glucose_readings)
    
    # Calculate trends by comparing recent vs older readings
    bp_trend = "stable"
    glucose_trend = "stable"
    
    # Get readings with timestamps for trend calculation
    bp_readings_with_dates = []
    glucose_readings_with_dates = []
    
    for event in vitals:
        payload = event.payload
        event_date = event.timestamp.date()
        
        # Extract BP with date
        if payload.get("bp"):
            bp_str = payload.get("bp", "")
            if "/" in bp_str:
                try:
                    systolic, diastolic = map(int, bp_str.split("/"))
                    bp_readings_with_dates.append({
                        "systolic": systolic,
                        "diastolic": diastolic,
                        "date": event_date
                    })
                except:
                    pass
        
        # Extract glucose with date
        if payload.get("glucose") is not None:
            glucose_value = payload.get("glucose")
            if isinstance(glucose_value, (int, float)) and glucose_value > 0:
                glucose_readings_with_dates.append({
                    "value": float(glucose_value),
                    "date": event_date
                })
    
    # Calculate BP trend
    if len(bp_readings_with_dates) >= 2:
        today = datetime.utcnow().date()
        recent_cutoff = today - timedelta(days=3)
        older_cutoff = today - timedelta(days=6)
        
        recent_bp = [r["systolic"] for r in bp_readings_with_dates if r["date"] >= recent_cutoff]
        older_bp = [r["systolic"] for r in bp_readings_with_dates if older_cutoff <= r["date"] < recent_cutoff]
        
        if recent_bp and older_bp:
            recent_avg = sum(recent_bp) / len(recent_bp)
            older_avg = sum(older_bp) / len(older_bp)
            
            # Use 5% threshold to determine trend
            change_pct = ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0
            
            if change_pct > 5:
                bp_trend = "increasing"
            elif change_pct < -5:
                bp_trend = "decreasing"
            else:
                bp_trend = "stable"
    
    # Calculate glucose trend
    if len(glucose_readings_with_dates) >= 2:
        today = datetime.utcnow().date()
        recent_cutoff = today - timedelta(days=3)
        older_cutoff = today - timedelta(days=6)
        
        recent_glucose = [r["value"] for r in glucose_readings_with_dates if r["date"] >= recent_cutoff]
        older_glucose = [r["value"] for r in glucose_readings_with_dates if older_cutoff <= r["date"] < recent_cutoff]
        
        if recent_glucose and older_glucose:
            recent_avg = sum(recent_glucose) / len(recent_glucose)
            older_avg = sum(older_glucose) / len(older_glucose)
            
            # Use 5% threshold to determine trend
            change_pct = ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0
            
            if change_pct > 5:
                glucose_trend = "increasing"
            elif change_pct < -5:
                glucose_trend = "decreasing"
            else:
                glucose_trend = "stable"
    
    # Get alerts
    from app.models import Alert
    alerts = db.query(Alert).filter(
        Alert.user_id == user_id,
        Alert.timestamp >= since
    ).order_by(Alert.timestamp.desc()).all()
    
    recent_symptoms = [e.payload.get("name", "unknown") for e in symptoms[:3]]
    
    # Calculate real adherence from AdherenceLog
    # Only count doses that were due during the period (scheduled_time in the past)
    from app.models import AdherenceLog, Medication
    period_end = datetime.utcnow()
    
    # Get adherence logs where scheduled_time was due during the period
    adherence_logs = db.query(AdherenceLog).filter(
        AdherenceLog.user_id == user_id,
        AdherenceLog.scheduled_time >= since,
        AdherenceLog.scheduled_time <= period_end  # Only count doses that were due (not future)
    ).all()
    
    adherence_pct = None
    if adherence_logs:
        total_due = len(adherence_logs)
        taken_logs = len([log for log in adherence_logs if log.status == "taken"])
        adherence_pct = (taken_logs / total_due * 100) if total_due > 0 else 0.0
    else:
        # Fallback: Calculate from medication events (only "taken" events count as positive)
        med_events = [e for e in events if e.type == "medication"]
        if med_events:
            # Count only "taken" events as positive adherence
            taken_events = len([e for e in med_events if e.payload.get("action") == "taken"])
            # For fallback, we assume all medication events represent expected doses
            adherence_pct = (taken_events / len(med_events) * 100) if med_events else 0.0
        else:
            adherence_pct = 0.0
    
    # Calculate days_logged (unique days with events)
    unique_dates = set()
    for event in events:
        event_date = event.timestamp.date()
        unique_dates.add(event_date)
    days_logged = len(unique_dates)
    
    # Calculate consecutive_streak (consecutive days with logging)
    if unique_dates:
        sorted_dates = sorted(unique_dates, reverse=True)
        consecutive_streak = 1
        today = datetime.utcnow().date()
        
        # Check if today has logging
        if today in sorted_dates:
            # Count backwards from today
            for i in range(1, len(sorted_dates)):
                expected_date = today - timedelta(days=i)
                if expected_date in sorted_dates:
                    consecutive_streak += 1
                else:
                    break
        else:
            # If today doesn't have logging, check from yesterday
            yesterday = today - timedelta(days=1)
            if yesterday in sorted_dates:
                consecutive_streak = 1
                for i in range(2, len(sorted_dates) + 1):
                    expected_date = yesterday - timedelta(days=i-1)
                    if expected_date in sorted_dates:
                        consecutive_streak += 1
                    else:
                        break
            else:
                consecutive_streak = 0
    else:
        consecutive_streak = 0
    
    metrics = DashboardMetric(
        adherence_pct=adherence_pct,
        avg_bp=avg_bp,
        bp_trend=bp_trend,
        avg_glucose=avg_glucose,
        glucose_trend=glucose_trend,
        recent_symptoms=recent_symptoms,
        alerts_count=len([a for a in alerts if a.level in ["amber", "red"]]),
        days_logged=days_logged,
        consecutive_streak=consecutive_streak
    )
    
    return DashboardResponse(
        status=level,
        score=score,
        metrics=metrics,
        recent_alerts=[
            {
                "id": a.id,
                "level": a.level,
                "score": a.score,
                "reason_codes": a.reason_codes,
                "timestamp": a.timestamp,
                "dismissed": a.dismissed
            } for a in alerts[:5]
        ],
        recent_events=[
            {
                "id": e.id,
                "user_id": e.user_id,
                "timestamp": e.timestamp,
                "type": e.type,
                "payload": e.payload,
                "source": e.source,
                "language": e.language
            } for e in events[:5]
        ],
        timestamp=datetime.utcnow()
    )
