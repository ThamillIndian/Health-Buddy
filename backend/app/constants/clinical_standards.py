"""
Clinical Standards and Guidelines Reference
Sources: WHO, IDA (Indian Diabetes Association), ESC/ESH
Used for validation and credibility of health assessments
"""

CLINICAL_SOURCES = {
    "glucose_diabetes": {
        "normal": (70, 140),
        "caution": (140, 180),
        "critical": (180, 999),
        "source": "IDA (Indian Diabetes Association) Guidelines 2023",
        "url": "https://www.indiandiabetics.org",
        "description": "Fasting glucose reference range for diabetes management"
    },
    "blood_pressure": {
        "normal": {"systolic": 140, "diastolic": 90},
        "stage1": {"systolic": 160, "diastolic": 100},
        "critical": {"systolic": 180, "diastolic": 120},
        "source": "ESC/ESH (European Society of Cardiology) Guidelines 2023",
        "url": "https://www.escardio.org",
        "description": "Blood pressure classification for hypertension management"
    },
    "adherence": {
        "excellent": (95, 100),
        "good": (80, 94),
        "fair": (50, 79),
        "poor": (0, 49),
        "source": "WHO (World Health Organization) Adherence Definition",
        "url": "https://www.who.int",
        "description": "Medication adherence classification standard"
    },
    "risk_scoring": {
        "green": {"min": 0, "max": 35},
        "amber": {"min": 35, "max": 65},
        "red": {"min": 65, "max": 100},
        "source": "Clinical Risk Assessment Framework",
        "description": "Risk level classification based on health metrics"
    }
}

# Approved medications database (FDA validation)
APPROVED_DRUGS = {
    "metformin": {"fda": True, "generic_name": "Metformin", "category": "Antidiabetic"},
    "insulin": {"fda": True, "generic_name": "Insulin", "category": "Antidiabetic"},
    "glibenclamide": {"fda": True, "generic_name": "Glibenclamide", "category": "Antidiabetic"},
    "sitagliptin": {"fda": True, "generic_name": "Sitagliptin", "category": "Antidiabetic"},
    "vildagliptin": {"fda": True, "generic_name": "Vildagliptin", "category": "Antidiabetic"},
    "amlodipine": {"fda": True, "generic_name": "Amlodipine", "category": "Antihypertensive"},
    "lisinopril": {"fda": True, "generic_name": "Lisinopril", "category": "Antihypertensive"},
    "losartan": {"fda": True, "generic_name": "Losartan", "category": "Antihypertensive"},
    "atenolol": {"fda": True, "generic_name": "Atenolol", "category": "Antihypertensive"},
    "salbutamol": {"fda": True, "generic_name": "Salbutamol", "category": "Bronchodilator"},
    "budesonide": {"fda": True, "generic_name": "Budesonide", "category": "Corticosteroid"},
    "montelukast": {"fda": True, "generic_name": "Montelukast", "category": "Leukotriene Inhibitor"},
    "levothyroxine": {"fda": True, "generic_name": "Levothyroxine", "category": "Thyroid Hormone"},
}

# Clinical disclaimer text
CLINICAL_DISCLAIMER = """
CLINICAL DATA SOURCES AND DISCLAIMER
=====================================

This health assessment is based on established clinical guidelines from:
• IDA (Indian Diabetes Association) - Guidelines 2023
• WHO (World Health Organization) - Medication Adherence Standards
• ESC/ESH (European Society of Cardiology/European Society of Hypertension) - Guidelines 2023
• FDA (Food and Drug Administration) - Drug Approval Database

IMPORTANT NOTICE:
This is an informational summary only and should NOT be used as a substitute for 
professional medical advice. All clinical assessments are based on data you have 
entered and may not represent complete health information.

FOR MEDICAL DECISIONS:
- Always consult your healthcare provider
- Provide this report to your doctor for review
- Do not make medication changes without medical guidance
- Seek immediate medical attention for emergencies

Data Sources:
- https://www.indiandiabetics.org
- https://www.who.int
- https://www.escardio.org
- https://www.fda.gov

This application is designed for health tracking and informational purposes only.
"""

def get_glucose_status(value: float, source: str = True):
    """Get glucose status with clinical source"""
    thresholds = CLINICAL_SOURCES.get("glucose_diabetes", {})
    
    status = "unknown"
    if value < thresholds["normal"][0]:
        status = "critical_low"
    elif value <= thresholds["normal"][1]:
        status = "normal"
    elif value <= thresholds["caution"][1]:
        status = "caution"
    else:
        status = "critical_high"
    
    result = {"status": status}
    if source:
        result["source"] = thresholds.get("source")
        result["url"] = thresholds.get("url")
    
    return result

def get_bp_status(systolic: float, diastolic: float, source: bool = True):
    """Get BP status with clinical source"""
    thresholds = CLINICAL_SOURCES.get("blood_pressure", {})
    
    status = "unknown"
    if systolic <= thresholds["normal"]["systolic"] and diastolic <= thresholds["normal"]["diastolic"]:
        status = "normal"
    elif systolic <= thresholds["stage1"]["systolic"] or diastolic <= thresholds["stage1"]["diastolic"]:
        status = "elevated"
    else:
        status = "critical"
    
    result = {"status": status}
    if source:
        result["source"] = thresholds.get("source")
        result["url"] = thresholds.get("url")
    
    return result

def get_adherence_status(percentage: float, source: bool = True):
    """Get adherence status with clinical source"""
    thresholds = CLINICAL_SOURCES.get("adherence", {})
    
    status = "unknown"
    if percentage >= thresholds["excellent"][0]:
        status = "excellent"
    elif percentage >= thresholds["good"][0]:
        status = "good"
    elif percentage >= thresholds["fair"][0]:
        status = "fair"
    else:
        status = "poor"
    
    result = {"status": status}
    if source:
        result["source"] = thresholds.get("source")
        result["url"] = thresholds.get("url")
    
    return result

def validate_drug(drug_name: str):
    """Validate if drug is FDA approved"""
    drug = APPROVED_DRUGS.get(drug_name.lower())
    
    if drug and drug.get("fda"):
        return {
            "approved": True,
            "drug_name": drug.get("generic_name"),
            "category": drug.get("category"),
            "source": "FDA Approved"
        }
    
    return {
        "approved": False,
        "drug_name": drug_name,
        "source": "Not in FDA Database"
    }
