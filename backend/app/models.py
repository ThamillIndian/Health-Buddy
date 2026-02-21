"""
SQLAlchemy ORM Models
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, nullable=True)
    language = Column(String, default="en")
    timezone = Column(String, default="UTC")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    condition_profiles = relationship("ConditionProfile", back_populates="user", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="user", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="user", cascade="all, delete-orphan")
    adherence_logs = relationship("AdherenceLog", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    derived_daily = relationship("DerivedDaily", back_populates="user", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")

class ConditionProfile(Base):
    __tablename__ = "condition_profiles"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    condition = Column(String, index=True)  # diabetes, hypertension, asthma, etc.
    thresholds = Column(JSON)  # {"bp_high": 140, "bp_low": 90, "glucose_high": 180, etc.}
    baseline = Column(JSON)  # {"bp_normal": "120/80", "glucose_normal": 100, etc.}
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="condition_profiles")

class Medication(Base):
    __tablename__ = "medications"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    name = Column(String, index=True)
    strength = Column(String)  # 500mg, 10mg, etc.
    category = Column(String)  # diabetes, hypertension, asthma, etc.
    frequency = Column(String)  # once_daily, twice_daily, thrice_daily
    times = Column(JSON)  # ["08:00", "20:00"] for twice daily
    active = Column(Boolean, default=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="medications")
    adherence_logs = relationship("AdherenceLog", back_populates="medication", cascade="all, delete-orphan")

class EventType(str, enum.Enum):
    vital = "vital"
    symptom = "symptom"
    medication = "medication"
    note = "note"

class Event(Base):
    __tablename__ = "events"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    type = Column(String, index=True)  # vital, symptom, medication, note
    payload = Column(JSON)  # {bp: "140/90", glucose: 120, symptom: "headache", severity: 2, etc.}
    source = Column(String)  # web, mobile, voice, api
    raw_text = Column(String, nullable=True)  # Original voice/text input
    language = Column(String, default="en")
    confidence = Column(Float, nullable=True)
    
    user = relationship("User", back_populates="events")

class AdherenceStatus(str, enum.Enum):
    taken = "taken"
    missed = "missed"
    snoozed = "snoozed"

class AdherenceLog(Base):
    __tablename__ = "adherence_log"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    med_id = Column(String, ForeignKey("medications.id"), index=True)
    scheduled_time = Column(DateTime, index=True)
    taken_time = Column(DateTime, nullable=True)
    status = Column(String)  # taken, missed, snoozed
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="adherence_logs")
    medication = relationship("Medication", back_populates="adherence_logs")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    level = Column(String, index=True)  # green, amber, red
    score = Column(Float)
    reason_codes = Column(JSON)  # ["threshold_breach", "trend_rising"]
    event_id = Column(String, ForeignKey("events.id"), nullable=True)
    dismissed = Column(Boolean, default=False)
    dismissed_at = Column(DateTime, nullable=True)
    
    user = relationship("User", back_populates="alerts")

class DerivedDaily(Base):
    __tablename__ = "derived_daily"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    date = Column(DateTime, index=True)
    adherence_pct = Column(Float, nullable=True)
    avg_bp = Column(String, nullable=True)
    bp_range = Column(String, nullable=True)
    avg_glucose = Column(Float, nullable=True)
    glucose_range = Column(String, nullable=True)
    avg_weight = Column(Float, nullable=True)
    symptoms_count = Column(Integer, default=0)
    alerts_count = Column(Integer, default=0)
    max_risk_level = Column(String, nullable=True)
    
    user = relationship("User", back_populates="derived_daily")

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    period_start = Column(DateTime)
    period_end = Column(DateTime)
    period_days = Column(Integer)
    file_path = Column(String, nullable=True)
    pdf_url = Column(String, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="reports")
