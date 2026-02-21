"""
Risk triage routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import TriageResult
from app.services.triage_engine import TriageEngine
from datetime import datetime

router = APIRouter()
triage_engine = TriageEngine()

@router.post("/users/{user_id}/triage/run", response_model=TriageResult)
async def run_triage(user_id: str, db: Session = Depends(get_db)):
    """Run triage assessment for user (using WHO/IDA/ESC/ESH clinical standards)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    score, level, reasons, sources = triage_engine.calculate_risk_score(user_id, db)
    
    return TriageResult(
        score=score,
        level=level,
        reasons=reasons,
        sources=sources,
        timestamp=datetime.utcnow()
    )

@router.get("/users/{user_id}/status")
async def get_status(user_id: str, db: Session = Depends(get_db)):
    """Get current health status (based on clinical standards)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    score, level, reasons, sources = triage_engine.calculate_risk_score(user_id, db)
    
    return {
        "user_id": user_id,
        "status": level,
        "score": score,
        "reasons": reasons,
        "sources": sources,
        "timestamp": datetime.utcnow()
    }
