"""
User management routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, ConditionProfile
from app.schemas import UserCreate, UserResponse
import uuid

router = APIRouter()

@router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user with condition profile"""
    
    # Check if email already exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        name=user_data.name,
        email=user_data.email,
        phone=user_data.phone,
        language=user_data.language,
        timezone=user_data.timezone
    )
    
    db.add(user)
    
    # Add condition profiles
    if user_data.condition_profiles:
        for cond in user_data.condition_profiles:
            condition_profile = ConditionProfile(
                id=str(uuid.uuid4()),
                user_id=user_id,
                condition=cond.condition,
                thresholds=cond.thresholds or {},
                baseline=cond.baseline or {}
            )
            db.add(condition_profile)
    
    db.commit()
    db.refresh(user)
    
    return user

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: Session = Depends(get_db)):
    """Get user profile"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, update_data: UserCreate, db: Session = Depends(get_db)):
    """Update user profile"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.name = update_data.name
    user.language = update_data.language
    user.timezone = update_data.timezone
    
    db.commit()
    db.refresh(user)
    
    return user
