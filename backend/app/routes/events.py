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
    
    # Run triage after event logged
    score, level, reasons = triage_engine.calculate_risk_score(user_id, db)
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
    
    # Get current risk level
    score, level, reasons = triage_engine.calculate_risk_score(user_id, db)
    
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
        if event.payload.get("vital_type") == "bp":
            bp_readings.append(event.payload.get("bp", ""))
        elif event.payload.get("vital_type") == "glucose":
            glucose_readings.append(event.payload.get("glucose", 0))
    
    if bp_readings:
        avg_bp = bp_readings[-1]  # Latest reading
    
    if glucose_readings:
        avg_glucose = sum(glucose_readings) / len(glucose_readings)
    
    # Get alerts
    from app.models import Alert
    alerts = db.query(Alert).filter(
        Alert.user_id == user_id,
        Alert.timestamp >= since
    ).order_by(Alert.timestamp.desc()).all()
    
    recent_symptoms = [e.payload.get("name", "unknown") for e in symptoms[:3]]
    
    metrics = DashboardMetric(
        adherence_pct=90.0,  # TODO: Calculate from AdherenceLog
        avg_bp=avg_bp,
        bp_trend="stable",
        avg_glucose=avg_glucose,
        glucose_trend="stable",
        recent_symptoms=recent_symptoms,
        alerts_count=len([a for a in alerts if a.level in ["amber", "red"]])
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
