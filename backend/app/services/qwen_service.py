"""
Qwen LLM Service for AI-powered health insights
Uses LM Studio's HTTP API (OpenAI-compatible)
"""
import os
import requests
from typing import Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class QwenService:
    """Service for Qwen AI-powered health insights via LM Studio"""
    
    def __init__(self):
        """Initialize Qwen service (connects to LM Studio running locally)"""
        self.api_url = os.getenv("QWEN_API_URL", "http://127.0.0.1:1234/v1")
        self.model_name = os.getenv("QWEN_MODEL_NAME", "qwen3")  # Default model name
        self.enabled = True
        
        # Test connection on init
        try:
            test_response = requests.get(f"{self.api_url.replace('/v1', '')}/models", timeout=2)
            if test_response.status_code == 200:
                logger.info("✅ Qwen LLM connected via LM Studio")
            else:
                logger.warning("⚠️  LM Studio may not be running")
        except Exception as e:
            logger.warning(f"⚠️  Could not connect to LM Studio: {str(e)}")
            logger.warning("   Qwen features will use fallback messages")
            self.enabled = False
    
    def _call_qwen(self, prompt: str, max_tokens: int = 100, temperature: float = 0.7) -> Optional[str]:
        """Call Qwen via LM Studio HTTP API"""
        if not self.enabled:
            return None
        
        try:
            # LM Studio uses OpenAI-compatible API
            response = requests.post(
                f"{self.api_url}/completions",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "top_p": 0.95,
                    "stop": ["\n\n", "---"]  # Stop sequences
                },
                timeout=30  # 30 second timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                # Extract text from response
                text = result.get('choices', [{}])[0].get('text', '').strip()
                
                # Better validation: ensure response is meaningful
                if text and len(text) > 8:  # At least 8 characters
                    logger.info(f"✅ Qwen generated response ({len(text)} chars)")
                    return text
                else:
                    logger.warning(f"⚠️  Qwen returned incomplete response ({len(text) if text else 0} chars): '{text[:50] if text else ''}'")
                    return None
            else:
                logger.warning(f"⚠️  Qwen API returned status {response.status_code}: {response.text}")
                return None
                
        except requests.exceptions.ConnectionError:
            logger.error("❌ Cannot connect to LM Studio. Is it running on http://127.0.0.1:1234?")
            return None
        except requests.exceptions.Timeout:
            logger.error("❌ Qwen API timeout (30s). Model may be slow or overloaded.")
            return None
        except Exception as e:
            logger.error(f"❌ Qwen API error: {str(e)}")
            return None
    
    def generate_daily_tip(self, user_name: str, adherence_pct: float, 
                          avg_glucose: Optional[float] = None,
                          avg_bp: Optional[str] = None) -> str:
        """Generate personalized daily health tip"""
        
        if not self.enabled:
            return self._get_default_tip(adherence_pct)
        
        # Build context from available data
        context_parts = []
        if adherence_pct is not None:
            context_parts.append(f"Medication adherence: {adherence_pct:.0f}%")
        if avg_glucose is not None:
            context_parts.append(f"Glucose: {avg_glucose:.0f} mg/dL")
        if avg_bp:
            context_parts.append(f"Blood pressure: {avg_bp}")
        
        context_str = "\n".join(context_parts) if context_parts else "No vitals tracked yet"
        
        prompt = f"""You are a supportive health coach for {user_name}.

Current Health Data:
{context_str}

Generate ONE actionable health tip in exactly 1-2 sentences.
- Start with an appropriate emoji (💪, 🌟, 📝, ✅, etc.)
- Be motivational and encouraging
- Something they can do TODAY
- No medical jargon
- Keep it concise

Example: "💪 Great adherence this week! Keep taking your meds on schedule."

Tip:"""
        
        ai_tip = self._call_qwen(prompt, max_tokens=80, temperature=0.5)
        
        if ai_tip and len(ai_tip) > 10:
            return ai_tip
        else:
            return self._get_default_tip(adherence_pct)
    
    def explain_alert(self, level: str, reasons: list, recent_score: float) -> str:
        """Explain why an alert was triggered in simple terms"""
        
        if not self.enabled:
            return self._get_default_alert_explanation(level)
        
        reasons_text = ", ".join(reasons[:3]) if reasons else "Health metrics out of normal range"
        
        prompt = f"""You are a health assistant explaining a health alert in SIMPLE, FRIENDLY terms.

Alert Level: {level.upper()}
Risk Score: {recent_score:.0f}/100
Main Reasons: {reasons_text}

Explain in exactly 1 sentence why this happened.
- Start with appropriate emoji: 🚨 for RED, ⚠️ for AMBER, ✅ for GREEN
- Be supportive and encouraging
- Suggest one action they can take
- No medical jargon

Example: "⚠️ Your glucose is slightly elevated - stay hydrated and check your intake."

Response:"""
        
        ai_explanation = self._call_qwen(prompt, max_tokens=70, temperature=0.5)
        
        if ai_explanation and len(ai_explanation) > 10:
            return ai_explanation
        else:
            return self._get_default_alert_explanation(level)
    
    def generate_doctor_summary(self, user_name: str, adherence_pct: float, 
                               symptoms_count: int, risk_level: str,
                               period_days: int = 7) -> str:
        """Generate doctor-ready executive summary"""
        
        if not self.enabled:
            return self._get_default_doctor_summary(user_name, adherence_pct, risk_level)
        
        prompt = f"""You are a medical report writer. Create a BRIEF doctor's summary (exactly 2 sentences).

Patient: {user_name}
Observation Period: {period_days} days
Medication Adherence: {adherence_pct:.0f}%
Symptom Events Recorded: {symptoms_count}
Overall Risk Assessment: {risk_level.upper()}

Requirements:
- Exactly 2 sentences maximum
- Professional medical tone
- Factual and data-driven
- Include adherence and risk in summary
- End with brief recommendation

Example: "Patient demonstrates {adherence_pct:.0f}% medication adherence with {symptoms_count} recorded symptoms over {period_days} days. Current risk assessment is {risk_level.upper()}; recommend continued monitoring."

Summary:"""
        
        ai_summary = self._call_qwen(prompt, max_tokens=100, temperature=0.4)
        
        if ai_summary and len(ai_summary) > 20:
            return ai_summary
        else:
            return self._get_default_doctor_summary(user_name, adherence_pct, risk_level)
    
    # Default fallback messages when Qwen is not available
    @staticmethod
    def _get_default_tip(adherence_pct: float) -> str:
        if adherence_pct >= 90:
            return "🌟 Excellent adherence! Keep maintaining this great habit!"
        elif adherence_pct >= 75:
            return "💪 Good job staying on track! Try to maintain consistency."
        else:
            return "📝 Remember to take your medications on time daily."
    
    @staticmethod
    def _get_default_alert_explanation(level: str) -> str:
        if level == "red":
            return "🚨 Your health metrics require immediate attention. Please consult your doctor."
        elif level == "amber":
            return "⚠️ Some metrics are elevated. Monitor closely and follow your care plan."
        else:
            return "✅ Your health looks stable. Keep up the good work!"
    
    @staticmethod
    def _get_default_doctor_summary(user_name: str, adherence_pct: float, risk_level: str) -> str:
        adherence_status = "excellent" if adherence_pct >= 90 else "good" if adherence_pct >= 75 else "moderate"
        return f"Patient {user_name} shows {adherence_status} medication adherence ({adherence_pct:.0f}%). Overall risk level: {risk_level.upper()}. Continue current management plan."
