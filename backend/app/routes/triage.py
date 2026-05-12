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

# Demo mode flag - set to True to use mock triage responses (bypasses database)
DEMO_MODE = True

@router.post("/users/{user_id}/triage/run", response_model=TriageResult)
async def run_triage(user_id: str, db: Session = Depends(get_db)):
    """Run triage assessment for user (using WHO/IDA/ESC/ESH clinical standards)"""
    
    # Demo mode: return mock triage assessment
    if DEMO_MODE:
        return TriageResult(
            score=0.3,
            level="green",
            reasons=[
                "✅ Excellent medication adherence (87.5%)",
                "✅ Blood pressure within normal range (128/82 mmHg)",
                "✅ Blood glucose well-controlled (98 mg/dL)",
                "✅ No critical symptoms reported",
                "✅ Stable weight trending"
            ],
            sources=[
                "WHO Clinical Standards",
                "ESC/ESH Hypertension Guidelines 2023",
                "IDA Diabetes Management Guidelines"
            ],
            timestamp=datetime.utcnow()
        )
    
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
    
    # Demo mode: return mock health status
    if DEMO_MODE:
        return {
            "user_id": user_id,
            "status": "green",
            "score": 0.3,
            "reasons": [
                "✅ Excellent medication adherence (87.5%)",
                "✅ Blood pressure within normal range (128/82 mmHg)",
                "✅ Blood glucose well-controlled (98 mg/dL)",
                "✅ No critical symptoms reported",
                "✅ Stable weight trending"
            ],
            "sources": [
                "WHO Clinical Standards",
                "ESC/ESH Hypertension Guidelines 2023",
                "IDA Diabetes Management Guidelines"
            ],
            "timestamp": datetime.utcnow()
        }
    
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
