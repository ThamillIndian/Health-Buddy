"""
Sarvam AI Speech-to-Text Integration
Supports Indian languages: Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati
"""
import os
import requests
from typing import Optional

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")
SARVAM_API_URL = "https://api.sarvam.ai/speech-to-text"

class SarvamService:
    """Service for Sarvam AI speech-to-text transcription"""
    
    @staticmethod
    def transcribe_audio(audio_file_path: str, language_code: str = "en-IN") -> Optional[str]:
        """
        Transcribe audio file using Sarvam AI
        
        Args:
            audio_file_path: Path to audio file (WAV format)
            language_code: Language code (e.g., 'hi-IN', 'ta-IN', 'te-IN')
        
        Returns:
            Transcribed text or None if failed
        """
        if not SARVAM_API_KEY:
            return None
        
        try:
            with open(audio_file_path, 'rb') as f:
                files = {'file': f}
                data = {'language_code': language_code}
                headers = {'Authorization': f'Bearer {SARVAM_API_KEY}'}
                
                response = requests.post(
                    SARVAM_API_URL,
                    files=files,
                    data=data,
                    headers=headers,
                    timeout=30
                )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('transcript', '')
            else:
                print(f"Sarvam API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Transcription error: {str(e)}")
            return None
    
    @staticmethod
    def transcribe_from_bytes(audio_bytes: bytes, language_code: str = "en-IN") -> Optional[str]:
        """
        Transcribe audio from bytes using Sarvam AI
        
        Args:
            audio_bytes: Audio file bytes
            language_code: Language code
        
        Returns:
            Transcribed text or None if failed
        """
        if not SARVAM_API_KEY:
            return None
        
        try:
            files = {'file': ('audio.wav', audio_bytes, 'audio/wav')}
            data = {'language_code': language_code}
            headers = {'Authorization': f'Bearer {SARVAM_API_KEY}'}
            
            response = requests.post(
                SARVAM_API_URL,
                files=files,
                data=data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('transcript', '')
            else:
                print(f"Sarvam API error: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"Transcription error: {str(e)}")
            return None
