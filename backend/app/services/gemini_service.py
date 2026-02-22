"""
Gemini LLM Service for health text normalization
Uses Google's Gemini API via google-genai SDK
Better multilingual support for Tamil, Hindi, and other Indian languages
"""
import os
import json
import uuid
from typing import Optional, Dict, Any
import logging

try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

logger = logging.getLogger(__name__)

class GeminiService:
    """Service for Gemini AI-powered health text normalization"""
    
    def __init__(self):
        """Initialize Gemini service"""
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        # Use gemini-2.5-flash for best balance of speed, accuracy, and stability
        self.model_name = os.getenv("GEMINI_MODEL_NAME", "gemini-2.5-flash")
        self.enabled = False
        self.client = None
        
        if not GEMINI_AVAILABLE:
            logger.warning("⚠️  google-genai package not installed. Run: pip install google-genai")
            return
        
        if not self.api_key:
            logger.warning("⚠️  GEMINI_API_KEY not set. Gemini features will use fallback")
            return
        
        try:
            # Initialize Gemini client
            self.client = genai.Client(api_key=self.api_key)
            self.enabled = True
            logger.info(f"✅ Gemini LLM connected successfully (model: {self.model_name})")
        except Exception as e:
            logger.warning(f"⚠️  Could not initialize Gemini client: {str(e)}")
            logger.warning("   Gemini features will use fallback")
            self.enabled = False
    
    def normalize_health_text(self, text: str, language: str = "en") -> Optional[Dict[str, Any]]:
        """
        Use Gemini to normalize transcribed health text into structured event
        Better multilingual support than Qwen, especially for Tamil and Hindi
        
        Args:
            text: Transcribed text from Sarvam AI
            language: Language code (en, ta, hi, etc.)
        
        Returns:
            Structured event dict or None if parsing fails
        """
        if not self.enabled or not self.client:
            return None
        
        prompt = f"""You are a health data extraction assistant. Extract health information from the following text in {language}.

Text: "{text}"

Extract ALL health data found and return ONLY a valid JSON object with this exact structure:
{{
  "type": "vital|symptom|medication|note",
  "payload": {{
    "bp": "systolic/diastolic" (if blood pressure found, e.g., "140/90"),
    "systolic": number (if BP found),
    "diastolic": number (if BP found),
    "glucose": number (if blood sugar found, in mg/dL),
    "weight": number (if weight found, in kg),
    "peak_flow": number (if peak flow found, in L/min),
    "name": "symptom name" (if symptom found),
    "severity": 1-3 (if symptom found: 1=mild, 2=moderate, 3=severe),
    "medication_name": "name" (if medication found),
    "action": "taken" (if medication found),
    "text": "original text" (only if type is "note" and nothing else found)
  }}
}}

Rules:
- Extract ALL vitals found (can have multiple: bp, glucose, weight, peak_flow)
- If multiple vitals found, type should be "vital"
- If symptom found, type is "symptom" with name and severity
- If medication found, type is "medication" with medication_name and action="taken"
- If nothing health-related found, type is "note" with text field
- Return ONLY the JSON, no explanation, no markdown, no code blocks
- Numbers should be actual numbers, not strings (except bp which is "systolic/diastolic")
- Understand Tamil, Hindi, and other Indian languages well
- Handle transcription variations (e.g., "அமுதம்" vs "அழுத்தம்" for blood pressure in Tamil)

Examples:
Input: "My blood pressure is 140 over 90, sugar 170, weight 80"
Output: {{"type": "vital", "payload": {{"bp": "140/90", "systolic": 140, "diastolic": 90, "glucose": 170, "weight": 80}}}}

Input: "என் ரத்த அமுதம் 190/90, சர்க்கரை 170, எடை 80"
Output: {{"type": "vital", "payload": {{"bp": "190/90", "systolic": 190, "diastolic": 90, "glucose": 170, "weight": 80}}}}

Input: "मेरा ब्लड प्रेशर 140/90 है, शुगर 170"
Output: {{"type": "vital", "payload": {{"bp": "140/90", "systolic": 140, "diastolic": 90, "glucose": 170}}}}

Input: "I have a severe headache"
Output: {{"type": "symptom", "payload": {{"name": "headache", "severity": 3}}}}

Input: "I took my metformin"
Output: {{"type": "medication", "payload": {{"medication_name": "metformin", "action": "taken"}}}}

Now extract from: "{text}"

JSON:"""

        try:
            # Use Gemini's generate_content with JSON response mode
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,  # Low temperature for accuracy
                    max_output_tokens=300,
                    response_mime_type="application/json",  # Force JSON response
                )
            )
            
            if not response or not hasattr(response, 'text'):
                logger.warning("Gemini normalization: No response from LLM")
                return None
            
            # Get JSON text
            json_text = response.text.strip()
            
            # Parse JSON
            parsed = json.loads(json_text)
            
            # Validate structure
            if "type" not in parsed or "payload" not in parsed:
                logger.warning(f"Gemini normalization: Invalid structure - missing type or payload")
                return None
            
            # Validate type
            if parsed["type"] not in ["vital", "symptom", "medication", "note"]:
                logger.warning(f"Gemini normalization: Invalid type '{parsed['type']}'")
                return None
            
            # Convert to our event format
            return {
                "id": str(uuid.uuid4()),
                "type": parsed["type"],
                "payload": parsed["payload"],
                "source": "voice",
                "language": language,
                "confidence": 0.95  # High confidence for Gemini
            }
            
        except json.JSONDecodeError as e:
            logger.warning(f"Gemini normalization: JSON decode error - {str(e)}")
            logger.debug(f"Response was: {json_text[:200] if 'json_text' in locals() else 'None'}")
            return None
        except Exception as e:
            logger.error(f"Gemini normalization error: {str(e)}")
            return None
