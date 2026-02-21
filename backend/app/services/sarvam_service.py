"""
Sarvam AI Speech-to-Text Integration (Updated to Official API)
Supports Indian languages: Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati
Model: Saaras v3
"""
import os
import requests
from typing import Optional, Literal
from io import BytesIO

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_API_URL = "https://api.sarvam.ai/speech-to-text"
SARVAM_MODEL = "saaras:v3"

# Supported modes
TranscribeMode = Literal["transcribe", "translate", "verbatim", "translit", "codemix"]

class SarvamService:
    """Service for Sarvam AI speech-to-text transcription using Saaras v3"""
    
    def __init__(self):
        """Initialize with API key check"""
        self.api_key = SARVAM_API_KEY
        self.api_url = SARVAM_API_URL
        self.model = SARVAM_MODEL
        
        # Try to use SDK if available
        self.use_sdk = False
        try:
            from sarvamai import SarvamAI
            if self.api_key:
                self.client = SarvamAI(api_subscription_key=self.api_key)
                self.use_sdk = True
        except ImportError:
            print("⚠️ Sarvam SDK not installed. Using raw requests as fallback.")
            self.use_sdk = False
    
    def transcribe_from_bytes(
        self, 
        audio_bytes: bytes, 
        language_code: str = "en-IN",
        mode: TranscribeMode = "transcribe"
    ) -> Optional[str]:
        """
        Transcribe audio from bytes using Sarvam AI Saaras v3
        
        Args:
            audio_bytes: Audio file bytes (WAV, MP3, M4A, WebM)
            language_code: Language code (e.g., 'hi-IN', 'ta-IN', 'te-IN')
            mode: Output mode - transcribe, translate, verbatim, translit, codemix
        
        Returns:
            Transcribed text or None if failed
        """
        if not self.api_key:
            print("⚠️ SARVAM_API_KEY not set. Voice transcription disabled.")
            return None
        
        try:
            # Use SDK if available
            if self.use_sdk:
                return self._transcribe_with_sdk(audio_bytes, language_code, mode)
            else:
                return self._transcribe_with_requests(audio_bytes, language_code, mode)
                
        except Exception as e:
            print(f"❌ Transcription error: {str(e)}")
            return None
    
    def _transcribe_with_sdk(
        self, 
        audio_bytes: bytes, 
        language_code: str,
        mode: TranscribeMode
    ) -> Optional[str]:
        """Transcribe using official Sarvam SDK"""
        try:
            audio_file = BytesIO(audio_bytes)
            audio_file.name = "audio.wav"
            
            response = self.client.speech_to_text.transcribe(
                file=audio_file,
                model=self.model,
                mode=mode
            )
            
            # Extract transcript from response
            if isinstance(response, dict):
                return response.get('transcript', response.get('text', ''))
            elif hasattr(response, 'transcript'):
                return response.transcript
            elif hasattr(response, 'text'):
                return response.text
            else:
                return str(response)
                
        except Exception as e:
            print(f"❌ SDK transcription error: {str(e)}")
            # Fallback to requests if SDK fails
            return self._transcribe_with_requests(audio_bytes, language_code, mode)
    
    def _transcribe_with_requests(
        self, 
        audio_bytes: bytes, 
        language_code: str,
        mode: TranscribeMode
    ) -> Optional[str]:
        """Transcribe using raw requests (fallback)"""
        try:
            files = {
                'file': ('audio.wav', audio_bytes, 'audio/wav')
            }
            
            data = {
                'model': self.model,
                'mode': mode
            }
            
            headers = {
                'api-subscription-key': self.api_key  # ✅ Correct header name (not Authorization: Bearer)
            }
            
            response = requests.post(
                self.api_url,
                files=files,
                data=data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                # Handle different response formats
                return result.get('transcript', result.get('text', result.get('output', '')))
            else:
                print(f"❌ Sarvam API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Requests transcription error: {str(e)}")
            return None
    
    def transcribe_audio(
        self, 
        audio_file_path: str, 
        language_code: str = "en-IN",
        mode: TranscribeMode = "transcribe"
    ) -> Optional[str]:
        """
        Transcribe audio file using Sarvam AI
        
        Args:
            audio_file_path: Path to audio file
            language_code: Language code
            mode: Output mode
        
        Returns:
            Transcribed text or None if failed
        """
        try:
            with open(audio_file_path, 'rb') as f:
                audio_bytes = f.read()
            return self.transcribe_from_bytes(audio_bytes, language_code, mode)
        except Exception as e:
            print(f"❌ File read error: {str(e)}")
            return None
