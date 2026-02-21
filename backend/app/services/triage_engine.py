"""
Risk triage engine - calculates risk score and determines alert level
"""
from datetime import datetime, timedelta
from typing import List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.models import Event, Medication, AdherenceLog, Alert
import uuid

class TriageEngine:
    """Rule-based risk assessment engine"""
    
    def __init__(self):
        self.weights = {
            "threshold_breach": 30,
            "trend_rising": 20,
            "symptom_severity": 15,
            "missed_medication": 25,
            "baseline_deviation": 10
        }
    
    def calculate_risk_score(self, user_id: str, db: Session) -> Tuple[float, str, List[str]]:
        """
        Calculate overall risk score (0-100)
        Returns: (score, level, reasons)
        """
        score = 0
        reasons = []
        
        # 1. Check threshold breaches
        threshold_score, threshold_reasons = self._check_threshold_breach(user_id, db)
        score += threshold_score
        reasons.extend(threshold_reasons)
        
        # 2. Check trends
        trend_score, trend_reasons = self._check_trend(user_id, db)
        score += trend_score
        reasons.extend(trend_reasons)
        
        # 3. Check symptom severity
        symptom_score, symptom_reasons = self._check_symptoms(user_id, db)
        score += symptom_score
        reasons.extend(symptom_reasons)
        
        # 4. Check missed medications
        med_score, med_reasons = self._check_missed_medications(user_id, db)
        score += med_score
        reasons.extend(med_reasons)
        
        # Cap at 100
        score = min(score, 100)
        
        # Determine level
        if score <= 30:
            level = "green"
        elif score <= 65:
            level = "amber"
        else:
            level = "red"
        
        return score, level, reasons
    
    def _check_threshold_breach(self, user_id: str, db: Session) -> Tuple[float, List[str]]:
        """Check if recent vitals exceed thresholds"""
        score = 0
        reasons = []
        
        # Get latest vital event
        latest_vital = db.query(Event).filter(
            Event.user_id == user_id,
            Event.type == "vital"
        ).order_by(Event.timestamp.desc()).first()
        
        if not latest_vital:
            return 0, []
        
        payload = latest_vital.payload
        
        # Check BP
        if "bp" in payload:
            bp_str = payload["bp"]  # Format: "140/90"
            try:
                systolic, diastolic = map(int, bp_str.split("/"))
                if systolic > 140 or diastolic > 90:
                    score += self.weights["threshold_breach"]
                    reasons.append(f"BP elevated: {bp_str}")
            except:
                pass
        
        # Check glucose
        if "glucose" in payload:
            glucose = float(payload["glucose"])
            if glucose > 180 or glucose < 70:
                score += 15
                reasons.append(f"Glucose out of range: {glucose}")
        
        return min(score, self.weights["threshold_breach"]), reasons
    
    def _check_trend(self, user_id: str, db: Session) -> Tuple[float, List[str]]:
        """Check 7-day trends"""
        score = 0
        reasons = []
        
        # Get last 7 days of BP readings
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_vitals = db.query(Event).filter(
            Event.user_id == user_id,
            Event.type == "vital",
            Event.timestamp >= seven_days_ago
        ).order_by(Event.timestamp.asc()).all()
        
        if len(recent_vitals) >= 3:
            systolics = []
            for event in recent_vitals:
                if "bp" in event.payload:
                    try:
                        sys, _ = map(int, event.payload["bp"].split("/"))
                        systolics.append(sys)
                    except:
                        pass
            
            if len(systolics) >= 3:
                # Check if trend is rising (each value > previous)
                is_rising = all(systolics[i] < systolics[i+1] for i in range(len(systolics)-1))
                
                if is_rising:
                    score += self.weights["trend_rising"]
                    reasons.append("BP rising trend over 7 days")
        
        return score, reasons
    
    def _check_symptoms(self, user_id: str, db: Session) -> Tuple[float, List[str]]:
        """Check recent symptom severity"""
        score = 0
        reasons = []
        
        # Get symptoms from last 24 hours
        last_24h = datetime.utcnow() - timedelta(hours=24)
        recent_symptoms = db.query(Event).filter(
            Event.user_id == user_id,
            Event.type == "symptom",
            Event.timestamp >= last_24h
        ).all()
        
        for symptom_event in recent_symptoms:
            severity = symptom_event.payload.get("severity", 1)
            score += severity * 5  # 5 points per severity level
        
        score = min(score, self.weights["symptom_severity"])
        
        if score > 0:
            symptoms = [e.payload.get("name", "unknown") for e in recent_symptoms]
            reasons.append(f"Recent symptoms: {', '.join(symptoms)}")
        
        return score, reasons
    
    def _check_missed_medications(self, user_id: str, db: Session) -> Tuple[float, List[str]]:
        """Check medication adherence"""
        score = 0
        reasons = []
        
        # Get missed medications in last 7 days
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        missed_meds = db.query(AdherenceLog).filter(
            AdherenceLog.user_id == user_id,
            AdherenceLog.status == "missed",
            AdherenceLog.scheduled_time >= seven_days_ago
        ).all()
        
        missed_count = len(missed_meds)
        score = min(missed_count * 5, self.weights["missed_medication"])
        
        if missed_count > 0:
            reasons.append(f"Missed {missed_count} medication doses in 7 days")
        
        return score, reasons
    
    def generate_alert(self, user_id: str, score: float, level: str, reasons: List[str], event_id: str, db: Session):
        """Generate alert if score warrants it"""
        
        if level in ["amber", "red"]:
            alert = Alert(
                id=str(uuid.uuid4()),
                user_id=user_id,
                timestamp=datetime.utcnow(),
                level=level,
                score=score,
                reason_codes=reasons,
                event_id=event_id,
                dismissed=False
            )
            db.add(alert)
            db.commit()
            return alert
        
        return None
