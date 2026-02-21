"""
Qwen helper - local LLM integration for polishing output
"""
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class QwenHelper:
    """Interface with local Qwen 3 model via LM Studio"""
    
    def __init__(self):
        self.enabled = os.getenv("ENABLE_QWEN", "True").lower() == "true"
        self.api_url = os.getenv("QWEN_API_URL", "http://localhost:1234/v1")
        self.model_name = "qwen3"  # LM Studio default
        
        if self.enabled:
            try:
                import requests
                self.requests = requests
            except ImportError:
                logger.warning("requests library not available, Qwen disabled")
                self.enabled = False
    
    def generate_summary_narrative(self, report_data: dict) -> Optional[str]:
        """Generate doctor-friendly narrative summary"""
        if not self.enabled:
            return None
        
        prompt = f"""You are a friendly health buddy. Convert this data into a warm, 
encouraging paragraph for the patient (not technical, no jargon):

Data:
- Medication Adherence: {report_data.get('adherence', 0)}%
- Avg BP: {report_data.get('avg_bp', 'N/A')} (Trend: {report_data.get('bp_trend', 'stable')})
- Avg Glucose: {report_data.get('avg_glucose', 'N/A')} (Trend: {report_data.get('glucose_trend', 'stable')})
- Alerts: {len(report_data.get('alerts', []))} alerts this week
- Top Symptom: {report_data.get('top_symptom', 'None reported')}

Write 3-4 sentences. Be encouraging, mention what they did well, 
and gently flag concerns.
Language: Simple, friendly, like talking to a friend."""
        
        return self._call_qwen(prompt, max_tokens=250, temperature=0.7)
    
    def generate_alert_explanation(self, alert_data: dict) -> Optional[str]:
        """Generate explanation for alert"""
        if not self.enabled:
            return None
        
        prompt = f"""You are a calm, supportive health buddy explaining a health alert 
to a patient. Make them feel supported, not scared.

Alert Details:
- Level: {alert_data.get('level', 'amber')}
- Current Reading: {alert_data.get('current_reading', 'N/A')}
- Normal Range: {alert_data.get('normal_range', 'N/A')}
- Trend: {alert_data.get('trend', 'rising')}

Write 3-4 sentences explaining:
1. What happened (simple language)
2. Why it matters (briefly)
3. What to do next (actionable steps)

Tone: Supportive, not alarming. Include relevant emoji."""
        
        return self._call_qwen(prompt, max_tokens=200, temperature=0.6)
    
    def generate_daily_tip(self, user_data: dict) -> Optional[str]:
        """Generate personalized daily health tip"""
        if not self.enabled:
            return None
        
        prompt = f"""You are a supportive health buddy. Generate ONE actionable tip 
for this patient based on their recent health data:

Condition: {user_data.get('condition', 'chronic health')}
Recent Vitals: {user_data.get('recent_vitals', 'N/A')}
Trend: {user_data.get('trend_direction', 'stable')}
Adherence: {user_data.get('adherence', 0)}%
Recent Symptoms: {', '.join(user_data.get('symptoms', []))}

Rules:
1. One sentence or short phrase only
2. Actionable TODAY (not vague advice)
3. Encouraging and positive tone
4. NO medical jargon
5. Include an emoji

Example: "💧 Tip: Drink a glass of water every hour today - it helps with BP management!" """
        
        return self._call_qwen(prompt, max_tokens=100, temperature=0.8)
    
    def generate_med_reminder(self, med_data: dict, user_data: dict) -> Optional[str]:
        """Generate engaging medication reminder"""
        if not self.enabled:
            return None
        
        prompt = f"""You are a friendly health buddy reminding a patient to take their 
medication. Make it feel supportive and easy.

Medication: {med_data.get('name', 'your medication')} {med_data.get('strength', '')}
Time: {med_data.get('time', 'now')}
Notes: {med_data.get('notes', 'none')}
Adherence This Week: {user_data.get('adherence', 0)}%

Write a short, friendly reminder (2-3 sentences) that:
1. Reminds them what to take
2. Includes a helpful tip or motivation
3. Includes an emoji

Example: "💊 Time for your Metformin! Taking it with food 
helps your stomach. You've been 90% consistent - let's keep the streak going!" """
        
        return self._call_qwen(prompt, max_tokens=150, temperature=0.8)
    
    def generate_achievement(self, week_data: dict) -> Optional[str]:
        """Generate motivational achievement message"""
        if not self.enabled:
            return None
        
        prompt = f"""You are an encouraging health buddy. Generate a motivational 
message celebrating this week's achievements.

Week Stats:
- Medication Adherence: {week_data.get('adherence', 0)}%
- Readings Logged: {week_data.get('readings_logged', 0)}
- Days Without Alerts: {week_data.get('clean_days', 0)}
- Best Performing Metric: {week_data.get('best_metric', 'consistency')}
- Overall Status: {week_data.get('status', 'stable')}

Write a 3-4 sentence celebration that:
1. Praises their specific achievement
2. Explains why it matters
3. Motivates them for next week

Tone: Genuinely happy and encouraging
Include: 1-2 emojis, exclamation marks"""
        
        return self._call_qwen(prompt, max_tokens=200, temperature=0.8)
    
    def _call_qwen(self, prompt: str, max_tokens: int = 200, temperature: float = 0.7) -> Optional[str]:
        """Call local Qwen 3 via LM Studio API"""
        if not self.enabled or not hasattr(self, 'requests'):
            return None
        
        try:
            response = self.requests.post(
                f"{self.api_url}/completions",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "top_p": 0.95,
                },
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('choices', [{}])[0].get('text', '').strip()
            else:
                logger.warning(f"Qwen API returned status {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Qwen error: {str(e)}")
            return None
