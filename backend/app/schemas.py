"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# User Schemas
class ConditionProfileCreate(BaseModel):
    condition: str
    thresholds: Dict[str, Any] = {}
    baseline: Dict[str, Any] = {}

class UserCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    language: str = "en"
    timezone: str = "UTC"
    condition_profiles: Optional[List[ConditionProfileCreate]] = None

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str]
    language: str
    timezone: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Medication Schemas
class MedicationCreate(BaseModel):
    name: str
    strength: str
    category: str
    frequency: str
    times: List[str]  # ["08:00", "20:00"]
    notes: Optional[str] = None

class MedicationResponse(BaseModel):
    id: str
    name: str
    strength: str
    category: str
    frequency: str
    times: List[str]
    active: bool
    
    class Config:
        from_attributes = True

# Event Schemas
class EventCreate(BaseModel):
    type: str  # vital, symptom, medication, note
    payload: Dict[str, Any]
    source: str = "web"
    raw_text: Optional[str] = None
    language: str = "en"
    confidence: Optional[float] = None

class EventResponse(BaseModel):
    id: str
    user_id: str
    timestamp: datetime
    type: str
    payload: Dict[str, Any]
    source: str
    language: str
    
    class Config:
        from_attributes = True

# Triage/Alert Schemas
class TriageResult(BaseModel):
    score: float = Field(0.0, ge=0, le=100)
    level: str  # green, amber, red
    reasons: List[str]
    sources: Dict[str, Any] = {}  # Clinical data sources (WHO, IDA, ESC/ESH)
    timestamp: datetime

class AlertResponse(BaseModel):
    id: str
    level: str
    score: float
    reason_codes: List[str]
    timestamp: datetime
    dismissed: bool
    
    class Config:
        from_attributes = True

# Dashboard Schemas
class DashboardMetric(BaseModel):
    adherence_pct: Optional[float]
    avg_bp: Optional[str]
    bp_trend: str = "stable"
    avg_glucose: Optional[float]
    glucose_trend: str = "stable"
    recent_symptoms: List[str] = []
    alerts_count: int = 0

class DashboardResponse(BaseModel):
    status: str  # green, amber, red
    score: float
    metrics: DashboardMetric
    recent_alerts: List[AlertResponse] = []
    recent_events: List[EventResponse] = []
    timestamp: datetime

# Report Schemas
class ReportRequest(BaseModel):
    period_days: int = 7

class ReportResponse(BaseModel):
    id: str
    user_id: str
    period_start: datetime
    period_end: datetime
    period_days: int
    generated_at: datetime
    pdf_url: Optional[str]
    
    class Config:
        from_attributes = True

# Transcription Schemas
class TranscriptionRequest(BaseModel):
    audio_base64: str
    language: str = "en"

class TranscriptionResponse(BaseModel):
    text: str
    language: str
    confidence: float
    event: Optional[EventResponse] = None

# Summary Schemas
class HealthSummary(BaseModel):
    narrative: str
    key_points: List[str]
    recommendation: str
    generated_at: datetime

class DailyTipResponse(BaseModel):
    tip: str
    category: str  # medication, exercise, diet, stress
    emoji: str
    generated_at: datetime
