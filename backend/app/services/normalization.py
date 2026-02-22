"""
Event normalization - parse voice/text into structured events
Supports multiple vitals in one sentence, Tamil, Hindi, Hinglish
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
            # Hinglish patterns
            r"mera\s*(?:blood\s*pressure|BP|bp)\s*(\d+)\s*[/-]\s*(\d+)\s*hai",
            r"(\d+)\s*[/-]\s*(\d+)\s*(?:blood\s*pressure|BP|bp)\s*hai",
        ],
        "hi": [
            r"(?:ब्लड\s*प्रेशर|बीपी|दबाव)\s*(?:है|:)?\s*(\d+)\s*[/-]\s*(\d+)",
            r"(\d+)\s*[/-]\s*(\d+)\s*(?:ब्लड\s*प्रेशर|बीपी)",
        ],
        "ta": [  # Tamil patterns - includes both "அழுத்தம்" and "அழுதம்" variations
            r"(?:ரத்த\s*அழுத்தம்|ரத்த\s*அழுதம்|இரத்த\s*அழுத்தம்|இரத்த\s*அழுதம்|BP|bp)\s*(\d+)\s*[/-]\s*(\d+)",
            r"(\d+)\s*[/-]\s*(\d+)\s*(?:ரத்த\s*அழுத்தம்|ரத்த\s*அழுதம்|இரத்த\s*அழுத்தம்|இரத்த\s*அழுதம்|BP|bp)",
            r"என்\s*(?:ரத்த\s*அழுத்தம்|ரத்த\s*அழுதம்|இரத்த\s*அழுத்தம்|இரத்த\s*அழுதம்)\s*(\d+)\s*[/-]\s*(\d+)",
        ]
    }
    
    GLUCOSE_PATTERNS = {
        "en": [
            r"(?:glucose|sugar|blood\s*sugar)\s*(?:is|:)?\s*(\d+)",
            r"(\d+)\s*(?:mg/dl|glucose|sugar)",
            # Hinglish patterns
            r"meri\s*(?:sugar|glucose)\s*(\d+)\s*hai",
            r"(?:sugar|glucose)\s*(\d+)\s*hai",
        ],
        "hi": [
            r"(?:ग्लूकोज|शुगर|ब्लड\s*शुगर)\s*(?:है|:)?\s*(\d+)",
            r"(\d+)\s*(?:ग्लूकोज|शुगर)",
        ],
        "ta": [  # Tamil patterns
            r"(?:சர்க்கரை|குளுக்கோஸ்|ரத்த\s*சர்க்கரை)\s*(\d+)",
            r"(\d+)\s*(?:சர்க்கரை|குளுக்கோஸ்)",
            r"என்\s*(?:சர்க்கரை|குளுக்கோஸ்)\s*(\d+)",
        ]
    }
    
    WEIGHT_PATTERNS = {
        "en": [
            r"(?:weight|weigh)\s*(?:is|:)?\s*(\d+(?:\.\d+)?)\s*(?:kg|kg\.)",
            # Hinglish patterns
            r"mera\s*(?:weight|weigh)\s*(\d+(?:\.\d+)?)\s*(?:kilo|kg)\s*hai",
            r"(?:weight|weigh)\s*(\d+(?:\.\d+)?)\s*(?:kilo|kg)",
        ],
        "hi": [
            r"(?:वजन|वेट)\s*(?:है|:)?\s*(\d+(?:\.\d+)?)\s*(?:किग्रा|kg)",
        ],
        "ta": [  # Tamil patterns
            r"(?:எடை|வெட்)\s*(\d+(?:\.\d+)?)\s*(?:கிலோ|kg)",
            r"என்\s*(?:எடை|வெட்)\s*(\d+(?:\.\d+)?)\s*(?:கிலோ|kg)",
        ]
    }
    
    PEAK_FLOW_PATTERNS = {
        "en": [
            r"(?:peak\s*flow|breathing)\s*(?:is|:)?\s*(\d+)",
            r"(\d+)\s*(?:peak\s*flow|L/min)",
        ],
        "hi": [
            r"(?:पीक\s*फ्लो|सांस)\s*(\d+)",
        ],
        "ta": [
            r"(?:பீக்\s*ஃப்ளோ|சுவாசம்)\s*(\d+)",
        ]
    }
    
    MEDICATION_PATTERNS = {
        "en": [
            r"(?:took|take|taken)\s+(?:my\s+)?([a-z]+)",
            r"(?:took|take|taken)\s+(\d+)\s*(?:mg|mg\.)\s+of\s+([a-z]+)",
            # Hinglish patterns
            r"maine\s+([a-z]+)\s+li",
            r"maine\s+apni\s+medicine\s+li",
        ],
        "hi": [
            r"(?:लिया|ली|लिए)\s+(?:मेरी\s+)?([a-zा-ज़]+)",
        ],
        "ta": [
            r"([a-z]+)\s*எடுத்தேன்",
            r"மருந்து\s*எடுத்தேன்",
        ]
    }
    
    SYMPTOM_PATTERNS = {
        "en": [
            r"(?:have|got|feeling|felt)\s+(?:a\s+)?([a-z\s]+?)(?:\s+(?:mild|moderate|severe))?(?:\.|,|$)",
            r"(?:headache|fever|fatigue|nausea|dizziness|chest\s+pain)",
            # Hinglish patterns
            r"mujhe\s+([a-z\s]+?)\s+hai",
            r"([a-z\s]+?)\s+hai",
        ],
        "hi": [
            r"(?:सिरदर्द|बुखार|कमजोरी|उल्टी|चक्कर|सीने\s+में\s+दर्द)",
        ],
        "ta": [
            r"(?:தலைவலி|காய்ச்சல்|மார்பு\s*வலி|வாந்தி)",
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
        "மிதமான": 2,
        "கடுமையான": 3,
    }
    
    def normalize_event(self, text: str, language: str = "en") -> Optional[Dict[str, Any]]:
        """
        Parse user input and return structured event
        Now supports multiple vitals in one sentence - combines them into one event
        """
        text_lower = text.lower()
        
        # Collect all vitals from the text (don't return early - collect all)
        vitals_payload = {}
        found_vitals = False
        
        # Try BP parsing
        bp_payload = self._parse_bp(text_lower, language)
        if bp_payload:
            vitals_payload.update(bp_payload)
            found_vitals = True
        
        # Try glucose parsing
        glucose_payload = self._parse_glucose(text_lower, language)
        if glucose_payload:
            vitals_payload.update(glucose_payload)
            found_vitals = True
        
        # Try weight parsing
        weight_payload = self._parse_weight(text_lower, language)
        if weight_payload:
            vitals_payload.update(weight_payload)
            found_vitals = True
        
        # Try peak flow parsing
        peak_flow_payload = self._parse_peak_flow(text_lower, language)
        if peak_flow_payload:
            vitals_payload.update(peak_flow_payload)
            found_vitals = True
        
        # If we found any vitals, return combined vital event
        if found_vitals:
            # If we have multiple vitals, remove individual vital_type (it will conflict)
            # Keep all the actual values: bp, glucose, weight, peak_flow, etc.
            if len([k for k in vitals_payload.keys() if k not in ["vital_type", "unit"]]) > 1:
                # Multiple vitals detected - remove vital_type to avoid conflicts
                vitals_payload.pop("vital_type", None)
            
            return {
                "id": str(uuid.uuid4()),
                "type": "vital",
                "payload": vitals_payload,
                "source": "voice",
                "language": language,
                "confidence": 0.95
            }
        
        # Try medication parsing (only if no vitals found)
        med_result = self._parse_medication(text_lower, language)
        if med_result:
            return med_result
        
        # Try symptom parsing (only if no vitals found)
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
        """Parse blood pressure - returns payload dict only"""
        # Try all languages if current language doesn't match
        languages_to_try = [language, "en", "hi", "ta"] if language not in ["en", "hi", "ta"] else [language, "en"]
        
        for lang in languages_to_try:
            patterns = self.BP_PATTERNS.get(lang, self.BP_PATTERNS["en"])
            
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    try:
                        systolic = int(match.group(1))
                        diastolic = int(match.group(2))
                        
                        # Validate ranges
                        if 50 <= systolic <= 250 and 30 <= diastolic <= 150:
                            return {
                                "vital_type": "bp",
                                "bp": f"{systolic}/{diastolic}",
                                "systolic": systolic,
                                "diastolic": diastolic,
                            }
                    except (ValueError, IndexError):
                        pass
        
        return None
    
    def _parse_glucose(self, text: str, language: str) -> Optional[Dict[str, Any]]:
        """Parse blood glucose - returns payload dict only"""
        # Try all languages if current language doesn't match
        languages_to_try = [language, "en", "hi", "ta"] if language not in ["en", "hi", "ta"] else [language, "en"]
        
        for lang in languages_to_try:
            patterns = self.GLUCOSE_PATTERNS.get(lang, self.GLUCOSE_PATTERNS["en"])
            
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    try:
                        glucose = int(match.group(1))
                        
                        # Validate range
                        if 30 <= glucose <= 500:
                            return {
                                "vital_type": "glucose",
                                "glucose": glucose,
                                "unit": "mg/dL"
                            }
                    except (ValueError, IndexError):
                        pass
        
        return None
    
    def _parse_weight(self, text: str, language: str) -> Optional[Dict[str, Any]]:
        """Parse weight - returns payload dict only"""
        # Try all languages if current language doesn't match
        languages_to_try = [language, "en", "hi", "ta"] if language not in ["en", "hi", "ta"] else [language, "en"]
        
        for lang in languages_to_try:
            patterns = self.WEIGHT_PATTERNS.get(lang, self.WEIGHT_PATTERNS["en"])
            
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    try:
                        weight = float(match.group(1))
                        
                        # Validate range
                        if 20 <= weight <= 250:
                            return {
                                "vital_type": "weight",
                                "weight": weight,
                                "unit": "kg"
                            }
                    except (ValueError, IndexError):
                        pass
        
        return None
    
    def _parse_peak_flow(self, text: str, language: str) -> Optional[Dict[str, Any]]:
        """Parse peak flow - returns payload dict only"""
        # Try all languages if current language doesn't match
        languages_to_try = [language, "en", "hi", "ta"] if language not in ["en", "hi", "ta"] else [language, "en"]
        
        for lang in languages_to_try:
            patterns = self.PEAK_FLOW_PATTERNS.get(lang, self.PEAK_FLOW_PATTERNS["en"])
            
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    try:
                        peak_flow = int(match.group(1))
                        
                        # Validate range
                        if 50 <= peak_flow <= 800:
                            return {
                                "vital_type": "peak_flow",
                                "peak_flow": peak_flow,
                                "unit": "L/min"
                            }
                    except (ValueError, IndexError):
                        pass
        
        return None
    
    def _parse_medication(self, text: str, language: str) -> Optional[Dict[str, Any]]:
        """Parse medication intake"""
        # Try all languages if current language doesn't match
        languages_to_try = [language, "en", "hi", "ta"] if language not in ["en", "hi", "ta"] else [language, "en"]
        
        for lang in languages_to_try:
            patterns = self.MEDICATION_PATTERNS.get(lang, self.MEDICATION_PATTERNS["en"])
            
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
        # Try all languages if current language doesn't match
        languages_to_try = [language, "en", "hi", "ta"] if language not in ["en", "hi", "ta"] else [language, "en"]
        
        for lang in languages_to_try:
            patterns = self.SYMPTOM_PATTERNS.get(lang, self.SYMPTOM_PATTERNS["en"])
            
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
