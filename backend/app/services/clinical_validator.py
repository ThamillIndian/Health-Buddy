"""
Clinical Validator Service
Validates health data against official standards and adds credibility
"""
import requests
import logging
from typing import Dict, Any, Optional
from app.constants.clinical_standards import CLINICAL_SOURCES, APPROVED_DRUGS, validate_drug

logger = logging.getLogger(__name__)

class ClinicalValidator:
    """Validates health data and provides clinical credibility"""
    
    @staticmethod
    def validate_glucose(value: float, condition: str = "diabetes") -> Dict[str, Any]:
        """Validate glucose against IDA standards"""
        thresholds = CLINICAL_SOURCES.get("glucose_diabetes", {})
        
        result = {
            "value": value,
            "unit": "mg/dL",
            "source": thresholds.get("source"),
            "url": thresholds.get("url")
        }
        
        if value < thresholds["normal"][0]:
            result["status"] = "critical_low"
            result["message"] = f"Hypoglycemia: {value} mg/dL (critical)"
        elif value <= thresholds["normal"][1]:
            result["status"] = "normal"
            result["message"] = f"Normal glucose: {value} mg/dL"
        elif value <= thresholds["caution"][1]:
            result["status"] = "caution"
            result["message"] = f"Elevated glucose: {value} mg/dL"
        else:
            result["status"] = "critical_high"
            result["message"] = f"Critically high glucose: {value} mg/dL"
        
        return result
    
    @staticmethod
    def validate_bp(systolic: float, diastolic: float) -> Dict[str, Any]:
        """Validate blood pressure against ESC/ESH standards"""
        thresholds = CLINICAL_SOURCES.get("blood_pressure", {})
        
        result = {
            "systolic": systolic,
            "diastolic": diastolic,
            "unit": "mmHg",
            "source": thresholds.get("source"),
            "url": thresholds.get("url")
        }
        
        if systolic <= thresholds["normal"]["systolic"] and diastolic <= thresholds["normal"]["diastolic"]:
            result["status"] = "normal"
            result["message"] = f"Normal BP: {systolic}/{diastolic} mmHg"
        elif systolic <= thresholds["stage1"]["systolic"] or diastolic <= thresholds["stage1"]["diastolic"]:
            result["status"] = "stage1_hypertension"
            result["message"] = f"Stage 1 Hypertension: {systolic}/{diastolic} mmHg"
        else:
            result["status"] = "stage2_hypertension"
            result["message"] = f"Stage 2 Hypertension: {systolic}/{diastolic} mmHg"
        
        return result
    
    @staticmethod
    def validate_adherence(taken: int, prescribed: int) -> Dict[str, Any]:
        """Calculate adherence percentage using WHO standards"""
        thresholds = CLINICAL_SOURCES.get("adherence", {})
        
        adherence_pct = (taken / prescribed * 100) if prescribed > 0 else 100
        
        result = {
            "adherence_percentage": adherence_pct,
            "doses_taken": taken,
            "doses_prescribed": prescribed,
            "source": thresholds.get("source"),
            "url": thresholds.get("url")
        }
        
        if adherence_pct >= thresholds["excellent"][0]:
            result["status"] = "excellent"
            result["message"] = f"Excellent adherence: {adherence_pct:.0f}%"
        elif adherence_pct >= thresholds["good"][0]:
            result["status"] = "good"
            result["message"] = f"Good adherence: {adherence_pct:.0f}%"
        elif adherence_pct >= thresholds["fair"][0]:
            result["status"] = "fair"
            result["message"] = f"Fair adherence: {adherence_pct:.0f}%"
        else:
            result["status"] = "poor"
            result["message"] = f"Poor adherence: {adherence_pct:.0f}%"
        
        return result
    
    @staticmethod
    def validate_drug(drug_name: str) -> Dict[str, Any]:
        """Validate if drug is FDA approved"""
        return validate_drug(drug_name)
    
    @staticmethod
    def get_clinical_references() -> Dict[str, Any]:
        """Get all clinical references used in this app"""
        return {
            "glucose": CLINICAL_SOURCES.get("glucose_diabetes"),
            "blood_pressure": CLINICAL_SOURCES.get("blood_pressure"),
            "adherence": CLINICAL_SOURCES.get("adherence"),
            "risk_scoring": CLINICAL_SOURCES.get("risk_scoring"),
            "disclaimer": "All assessments are based on established clinical guidelines and should be reviewed by healthcare providers."
        }
