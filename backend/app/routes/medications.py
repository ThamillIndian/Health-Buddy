"""
Medication management routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from app.database import get_db
from app.models import User, Medication
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
