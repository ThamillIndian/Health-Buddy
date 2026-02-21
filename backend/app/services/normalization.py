"""
Event normalization - parse voice/text into structured events
"""
import re
from typing import Optional, Dict, Any
import uuid
from datetime import datetime

class NormalizationAgent:
    """Parse user input into structured health events"""
    
    # Pattern definitions for different inputs
    BP_PATTERNS = {
        "en": [
            r"(?:blood\s*pressure|BP|bp)\s*(?:is|:)?\s*(\d+)\s*[/-]\s*(\d+)",
            r"(\d+)\s*[/-]\s*(\d+)\s*(?:blood\s*pressure|BP|bp)",
        ],
        "hi": [
            r"(?:ब्लड\s*प्रेशर|बीपी|दबाव)\s*(?:है|:)?\s*(\d+)\s*[/-]\s*(\d+)",
            r"(\d+)\s*[/-]\s*(\d+)\s*(?:ब्लड\s*प्रेशर|बीपी)",
        ]
    }
    
    GLUCOSE_PATTERNS = {
        "en": [
            r"(?:glucose|sugar|blood\s*sugar)\s*(?:is|:)?\s*(\d+)",
            r"(\d+)\s*(?:mg/dl|glucose|sugar)",
        ],
        "hi": [
            r"(?:ग्लूकोज|शुगर|ब्लड\s*शुगर)\s*(?:है|:)?\s*(\d+)",
            r"(\d+)\s*(?:ग्लूकोज|शुगर)",
        ]
    }
    
    WEIGHT_PATTERNS = {
        "en": [
            r"(?:weight|weigh)\s*(?:is|:)?\s*(\d+(?:\.\d+)?)\s*(?:kg|kg\.)",
        ],
        "hi": [
            r"(?:वजन|वेट)\s*(?:है|:)?\s*(\d+(?:\.\d+)?)\s*(?:किग्रा|kg)",
        ]
    }
    
    MEDICATION_PATTERNS = {
        "en": [
            r"(?:took|take|taken)\s+(?:my\s+)?([a-z]+)",
            r"(?:took|take|taken)\s+(\d+)\s*(?:mg|mg\.)\s+of\s+([a-z]+)",
        ],
        "hi": [
            r"(?:लिया|ली|लिए)\s+(?:मेरी\s+)?([a-zा-ज़]+)",
        ]
    }
    
    SYMPTOM_PATTERNS = {
        "en": [
            r"(?:have|got|feeling|felt)\s+(?:a\s+)?([a-z\s]+?)(?:\s+(?:mild|moderate|severe))?(?:\.|,|$)",
            r"(?:headache|fever|fatigue|nausea|dizziness|chest\s+pain)",
        ],
        "hi": [
            r"(?:सिरदर्द|बुखार|कमजोरी|उल्टी|चक्कर|सीने\s+में\s+दर्द)",
        ]
    }
    
    SEVERITY_KEYWORDS = {
        "mild": 1,
        "moderate": 2,
        "severe": 3,
        "light": 1,
        "heavy": 3,
        "हल्का": 1,
        "मध्यम": 2,
        "तीव्र": 3,
    }
    
    def normalize_event(self, text: str, language: str = "en") -> Optional[Dict[str, Any]]:
        """
        Parse user input and return structured event
        """
        text_lower = text.lower()
        
        # Try BP parsing
        bp_result = self._parse_bp(text_lower, language)
        if bp_result:
            return bp_result
        
        # Try glucose parsing
        glucose_result = self._parse_glucose(text_lower, language)
        if glucose_result:
            return glucose_result
        
        # Try weight parsing
        weight_result = self._parse_weight(text_lower, language)
        if weight_result:
            return weight_result
        
        # Try medication parsing
        med_result = self._parse_medication(text_lower, language)
        if med_result:
            return med_result
        
        # Try symptom parsing
        symptom_result = self._parse_symptom(text_lower, language)
        if symptom_result:
            return symptom_result
        
        # If nothing matched, return generic note
        return {
            "id": str(uuid.uuid4()),
            "type": "note",
            "payload": {"text": text},
            "source": "voice",
            "language": language,
            "confidence": 0.5
        }
    
    def _parse_bp(self, text: str, language: str) -> Optional[Dict[str, Any]]:
        """Parse blood pressure"""
        patterns = self.BP_PATTERNS.get(language, self.BP_PATTERNS["en"])
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    systolic = int(match.group(1))
                    diastolic = int(match.group(2))
                    
                    # Validate ranges
                    if 50 <= systolic <= 250 and 30 <= diastolic <= 150:
                        return {
                            "id": str(uuid.uuid4()),
                            "type": "vital",
                            "payload": {
                                "vital_type": "bp",
                                "bp": f"{systolic}/{diastolic}",
                                "systolic": systolic,
                                "diastolic": diastolic,
                            },
                            "source": "voice",
                            "language": language,
                            "confidence": 0.95
                        }
                except (ValueError, IndexError):
                    pass
        
        return None
    
    def _parse_glucose(self, text: str, language: str) -> Optional[Dict[str, Any]]:
        """Parse blood glucose"""
        patterns = self.GLUCOSE_PATTERNS.get(language, self.GLUCOSE_PATTERNS["en"])
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    glucose = int(match.group(1))
                    
                    # Validate range
                    if 30 <= glucose <= 500:
                        return {
                            "id": str(uuid.uuid4()),
                            "type": "vital",
                            "payload": {
                                "vital_type": "glucose",
                                "glucose": glucose,
                                "unit": "mg/dL"
                            },
                            "source": "voice",
                            "language": language,
                            "confidence": 0.95
                        }
                except (ValueError, IndexError):
                    pass
        
        return None
    
    def _parse_weight(self, text: str, language: str) -> Optional[Dict[str, Any]]:
        """Parse weight"""
        patterns = self.WEIGHT_PATTERNS.get(language, self.WEIGHT_PATTERNS["en"])
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    weight = float(match.group(1))
                    
                    # Validate range
                    if 20 <= weight <= 250:
                        return {
                            "id": str(uuid.uuid4()),
                            "type": "vital",
                            "payload": {
                                "vital_type": "weight",
                                "weight": weight,
                                "unit": "kg"
                            },
                            "source": "voice",
                            "language": language,
                            "confidence": 0.95
                        }
                except (ValueError, IndexError):
                    pass
        
        return None
    
    def _parse_medication(self, text: str, language: str) -> Optional[Dict[str, Any]]:
        """Parse medication intake"""
        patterns = self.MEDICATION_PATTERNS.get(language, self.MEDICATION_PATTERNS["en"])
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                med_name = match.group(1) if match.lastindex >= 1 else "medication"
                
                return {
                    "id": str(uuid.uuid4()),
                    "type": "medication",
                    "payload": {
                        "action": "taken",
                        "medication_name": med_name,
                        "time": datetime.utcnow().isoformat()
                    },
                    "source": "voice",
                    "language": language,
                    "confidence": 0.85
                }
        
        return None
    
    def _parse_symptom(self, text: str, language: str) -> Optional[Dict[str, Any]]:
        """Parse symptoms"""
        patterns = self.SYMPTOM_PATTERNS.get(language, self.SYMPTOM_PATTERNS["en"])
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                symptom_name = match.group(1) if match.lastindex >= 1 else "symptom"
                
                # Extract severity
                severity = 2  # Default moderate
                for keyword, sev in self.SEVERITY_KEYWORDS.items():
                    if keyword.lower() in text.lower():
                        severity = sev
                        break
                
                return {
                    "id": str(uuid.uuid4()),
                    "type": "symptom",
                    "payload": {
                        "name": symptom_name.strip(),
                        "severity": severity,  # 1=mild, 2=moderate, 3=severe
                        "time": datetime.utcnow().isoformat()
                    },
                    "source": "voice",
                    "language": language,
                    "confidence": 0.80
                }
        
        return None
