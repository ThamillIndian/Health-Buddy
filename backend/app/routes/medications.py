"""
Medication management routes
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date, time as dt_time
from typing import List, Optional
from app.database import get_db
from app.models import User, Medication, AdherenceLog, Event
from app.schemas import MedicationCreate, MedicationResponse
import uuid

router = APIRouter()

@router.post("/users/{user_id}/medications", response_model=MedicationResponse)
async def add_medication(user_id: str, med_data: MedicationCreate, db: Session = Depends(get_db)):
    """Add a new medication for user"""
    
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create medication
    medication = Medication(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=med_data.name,
        strength=med_data.strength,
        category=med_data.category,
        frequency=med_data.frequency,
        times=med_data.times,
        active=True,
        notes=med_data.notes
    )
    
    db.add(medication)
    db.commit()
    db.refresh(medication)
    
    # Create AdherenceLog entries for the next 30 days based on schedule
    today = datetime.utcnow().date()
    
    for day_offset in range(30):  # Create entries for next 30 days
        current_date = today + timedelta(days=day_offset)
        
        for time_str in med_data.times:
            try:
                # Parse time string (e.g., "08:00")
                hour, minute = map(int, time_str.split(':'))
                scheduled_datetime = datetime.combine(current_date, dt_time(hour, minute))
                
                # Only create if scheduled time is in the future or today
                if scheduled_datetime >= datetime.utcnow() or day_offset == 0:
                    adherence_log = AdherenceLog(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        med_id=medication.id,
                        scheduled_time=scheduled_datetime,
                        status="pending",  # Will be updated to "taken" or "missed"
                        notes=None
                    )
                    db.add(adherence_log)
            except Exception as e:
                pass  # Skip invalid time formats
    
    db.commit()
    return medication

@router.get("/users/{user_id}/medications", response_model=List[MedicationResponse])
async def get_medications(user_id: str, db: Session = Depends(get_db)):
    """Get all medications for user"""
    
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    medications = db.query(Medication).filter(
        Medication.user_id == user_id,
        Medication.active == True
    ).order_by(Medication.created_at.desc()).all()
    
    return medications

@router.get("/users/{user_id}/medications/{med_id}", response_model=MedicationResponse)
async def get_medication(user_id: str, med_id: str, db: Session = Depends(get_db)):
    """Get specific medication"""
    
    medication = db.query(Medication).filter(
        Medication.id == med_id,
        Medication.user_id == user_id
    ).first()
    
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    return medication

@router.put("/users/{user_id}/medications/{med_id}", response_model=MedicationResponse)
async def update_medication(user_id: str, med_id: str, med_data: MedicationCreate, db: Session = Depends(get_db)):
    """Update medication"""
    
    medication = db.query(Medication).filter(
        Medication.id == med_id,
        Medication.user_id == user_id
    ).first()
    
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    # Update fields
    medication.name = med_data.name
    medication.strength = med_data.strength
    medication.category = med_data.category
    medication.frequency = med_data.frequency
    medication.times = med_data.times
    medication.notes = med_data.notes
    
    db.commit()
    db.refresh(medication)
    
    return medication

@router.delete("/users/{user_id}/medications/{med_id}")
async def delete_medication(user_id: str, med_id: str, db: Session = Depends(get_db)):
    """Delete (deactivate) medication"""
    
    medication = db.query(Medication).filter(
        Medication.id == med_id,
        Medication.user_id == user_id
    ).first()
    
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    # Soft delete (mark as inactive)
    medication.active = False
    db.commit()
    
    return {"status": "deleted", "message": f"Medication {medication.name} deleted"}

@router.post("/users/{user_id}/medications/{med_id}/activate")
async def activate_medication(user_id: str, med_id: str, db: Session = Depends(get_db)):
    """Reactivate a medication"""
    
    medication = db.query(Medication).filter(
        Medication.id == med_id,
        Medication.user_id == user_id
    ).first()
    
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    medication.active = True
    db.commit()
    db.refresh(medication)
    
    return {"status": "activated", "message": f"Medication {medication.name} reactivated"}

@router.post("/users/{user_id}/medications/{med_id}/mark-taken")
async def mark_medication_taken(
    user_id: str, 
    med_id: str, 
    scheduled_time: Optional[str] = Body(None),  # ISO format datetime, if None uses today's scheduled times
    db: Session = Depends(get_db)
):
    """Mark a medication as taken"""
    
    medication = db.query(Medication).filter(
        Medication.id == med_id,
        Medication.user_id == user_id
    ).first()
    
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    now = datetime.utcnow()
    
    if scheduled_time:
        # Mark specific scheduled time as taken
        try:
            target_time = datetime.fromisoformat(scheduled_time.replace('Z', '+00:00'))
            if target_time.tzinfo:
                target_time = target_time.replace(tzinfo=None)
        except:
            target_time = now
        
        adherence_log = db.query(AdherenceLog).filter(
            AdherenceLog.user_id == user_id,
            AdherenceLog.med_id == med_id,
            AdherenceLog.scheduled_time >= target_time - timedelta(hours=1),
            AdherenceLog.scheduled_time <= target_time + timedelta(hours=1)
        ).first()
    else:
        # Find today's scheduled doses that haven't been taken yet
        today_start = datetime.combine(now.date(), dt_time.min)
        today_end = datetime.combine(now.date(), dt_time.max)
        
        adherence_log = db.query(AdherenceLog).filter(
            AdherenceLog.user_id == user_id,
            AdherenceLog.med_id == med_id,
            AdherenceLog.scheduled_time >= today_start,
            AdherenceLog.scheduled_time <= today_end,
            AdherenceLog.status.in_(["pending", "missed"])  # Can mark missed doses as taken
        ).order_by(AdherenceLog.scheduled_time.desc()).first()
    
    if adherence_log:
        adherence_log.status = "taken"
        adherence_log.taken_time = now
        db.commit()
        
        # Also log as event
        event = Event(
            id=str(uuid.uuid4()),
            user_id=user_id,
            timestamp=now,
            type="medication",
            payload={
                "action": "taken",
                "medication_id": med_id,
                "medication_name": medication.name,
                "medication_strength": medication.strength
            },
            source="web",
            language="en"
        )
        db.add(event)
        db.commit()
        
        return {"status": "success", "message": f"{medication.name} marked as taken"}
    else:
        # Create a new AdherenceLog entry if none found
        adherence_log = AdherenceLog(
            id=str(uuid.uuid4()),
            user_id=user_id,
            med_id=med_id,
            scheduled_time=now,
            taken_time=now,
            status="taken",
            notes=None
        )
        db.add(adherence_log)
        
        # Also create event
        event = Event(
            id=str(uuid.uuid4()),
            user_id=user_id,
            timestamp=now,
            type="medication",
            payload={
                "action": "taken",
                "medication_id": med_id,
                "medication_name": medication.name,
                "medication_strength": medication.strength
            },
            source="web",
            language="en"
        )
        db.add(event)
        db.commit()
        
        return {"status": "success", "message": f"{medication.name} marked as taken (new entry created)"}

@router.post("/users/{user_id}/medications/check-missed")
async def check_missed_medications(user_id: str, db: Session = Depends(get_db)):
    """Check for medications that should be marked as missed"""
    now = datetime.utcnow()
    # Check medications scheduled in the past 24 hours that are still pending
    cutoff = now - timedelta(hours=24)
    
    missed_logs = db.query(AdherenceLog).filter(
        AdherenceLog.user_id == user_id,
        AdherenceLog.scheduled_time < now,
        AdherenceLog.scheduled_time >= cutoff,
        AdherenceLog.status == "pending"
    ).all()
    
    count = 0
    for log in missed_logs:
        log.status = "missed"
        count += 1
    
    db.commit()
    
    return {"status": "success", "missed_count": count, "message": f"Marked {count} medication(s) as missed"}
