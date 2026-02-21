"""
Risk triage engine - calculates risk score and determines alert level
Uses clinically-validated thresholds from WHO, IDA, and ESC/ESH guidelines
"""
from datetime import datetime, timedelta
from typing import List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.models import Event, Medication, AdherenceLog, Alert
from app.constants.clinical_standards import CLINICAL_SOURCES, get_glucose_status, get_bp_status, get_adherence_status
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
    
    def calculate_risk_score(self, user_id: str, db: Session) -> Tuple[float, str, List[str], Dict]:
        """
        Calculate overall risk score (0-100)
        Returns: (score, level, reasons, sources)
        Uses clinically-validated thresholds from WHO, IDA, ESC/ESH
        """
        score = 0
        reasons = []
        sources = {}
        
        # 1. Check threshold breaches (based on clinical standards)
        threshold_score, threshold_reasons, threshold_sources = self._check_threshold_breach(user_id, db)
        score += threshold_score
        reasons.extend(threshold_reasons)
        sources.update(threshold_sources)
        
        # 2. Check trends
        trend_score, trend_reasons = self._check_trend(user_id, db)
        score += trend_score
        reasons.extend(trend_reasons)
        
        # 3. Check symptom severity
        symptom_score, symptom_reasons = self._check_symptoms(user_id, db)
        score += symptom_score
        reasons.extend(symptom_reasons)
        
        # 4. Check missed medications (WHO adherence standards)
        med_score, med_reasons, med_sources = self._check_missed_medications(user_id, db)
        score += med_score
        reasons.extend(med_reasons)
        sources.update(med_sources)
        
        # Cap at 100
        score = min(score, 100)
        
        # Determine level (based on clinical risk scoring framework)
        risk_scoring = CLINICAL_SOURCES.get("risk_scoring", {})
        if score <= risk_scoring.get("green", {}).get("max", 35):
            level = "green"
        elif score <= risk_scoring.get("amber", {}).get("max", 65):
            level = "amber"
        else:
            level = "red"
        
        # Add risk scoring source
        sources["risk_level"] = {
            "source": risk_scoring.get("source"),
            "description": risk_scoring.get("description")
        }
        
        return score, level, reasons, sources
    
    def _check_threshold_breach(self, user_id: str, db: Session) -> Tuple[float, List[str], Dict]:
        """Check if recent vitals exceed clinical thresholds (IDA/ESC/ESH)"""
        score = 0
        reasons = []
        sources = {}
        
        # Get latest vital event
        latest_vital = db.query(Event).filter(
            Event.user_id == user_id,
            Event.type == "vital"
        ).order_by(Event.timestamp.desc()).first()
        
        if not latest_vital:
            return 0, [], {}
        
        payload = latest_vital.payload
        glucose_thresholds = CLINICAL_SOURCES.get("glucose_diabetes", {})
        bp_thresholds = CLINICAL_SOURCES.get("blood_pressure", {})
        
        # Check BP (ESC/ESH Guidelines)
        if "bp" in payload:
            bp_str = payload["bp"]  # Format: "140/90"
            try:
                systolic, diastolic = map(int, bp_str.split("/"))
                
                # Use clinical standard thresholds
                if systolic > bp_thresholds["normal"]["systolic"] or diastolic > bp_thresholds["normal"]["diastolic"]:
                    score += self.weights["threshold_breach"]
                    reasons.append(f"BP elevated: {bp_str} (per ESC/ESH Guidelines)")
                    sources["bp"] = {
                        "source": bp_thresholds.get("source"),
                        "url": bp_thresholds.get("url"),
                        "threshold": f"{bp_thresholds['normal']['systolic']}/{bp_thresholds['normal']['diastolic']}"
                    }
            except:
                pass
        
        # Check glucose (IDA Guidelines)
        if "glucose" in payload:
            glucose = float(payload["glucose"])
            
            # Use clinical standard thresholds
            if glucose < glucose_thresholds["normal"][0] or glucose > glucose_thresholds["caution"][1]:
                score += 15
                reasons.append(f"Glucose out of range: {glucose} mg/dL (per IDA Guidelines)")
                sources["glucose"] = {
                    "source": glucose_thresholds.get("source"),
                    "url": glucose_thresholds.get("url"),
                    "normal_range": f"{glucose_thresholds['normal'][0]}-{glucose_thresholds['normal'][1]}"
                }
        
        return min(score, self.weights["threshold_breach"]), reasons, sources
    
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
    
    def _check_missed_medications(self, user_id: str, db: Session) -> Tuple[float, List[str], Dict]:
        """Check medication adherence (WHO Adherence Standards)"""
        score = 0
        reasons = []
        sources = {}
        
        # Get missed medications in last 7 days
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        missed_meds = db.query(AdherenceLog).filter(
            AdherenceLog.user_id == user_id,
            AdherenceLog.status == "missed",
            AdherenceLog.scheduled_time >= seven_days_ago
        ).all()
        
        # Calculate adherence percentage
        total_meds = db.query(AdherenceLog).filter(
            AdherenceLog.user_id == user_id,
            AdherenceLog.scheduled_time >= seven_days_ago
        ).count()
        
        missed_count = len(missed_meds)
        adherence_pct = ((total_meds - missed_count) / total_meds * 100) if total_meds > 0 else 100
        
        adherence_thresholds = CLINICAL_SOURCES.get("adherence", {})
        
        # Score based on WHO adherence standards
        if adherence_pct < adherence_thresholds["poor"][1]:
            score = self.weights["missed_medication"]
            reasons.append(f"Poor adherence: {adherence_pct:.0f}% (per WHO Standards - <50%)")
        elif adherence_pct < adherence_thresholds["fair"][1]:
            score = self.weights["missed_medication"] * 0.6
            reasons.append(f"Fair adherence: {adherence_pct:.0f}% (per WHO Standards - 50-79%)")
        elif adherence_pct < adherence_thresholds["good"][1]:
            score = self.weights["missed_medication"] * 0.2
            reasons.append(f"Good adherence: {adherence_pct:.0f}% (per WHO Standards - 80-94%)")
        
        if missed_count > 0:
            sources["adherence"] = {
                "source": adherence_thresholds.get("source"),
                "url": adherence_thresholds.get("url"),
                "percentage": adherence_pct,
                "missed_doses": missed_count
            }
        
        return score, reasons, sources
    
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
