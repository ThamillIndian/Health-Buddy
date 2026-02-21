"""
Voice/Audio routes for transcription (Updated for Saaras v3)
"""
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from app.services.sarvam_service import SarvamService, TranscribeMode
from typing import Literal
import os

router = APIRouter()
sarvam_service = SarvamService()

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...), 
    language: str = Form("en-IN"),
    mode: TranscribeMode = Form("transcribe")
):
    """
    Transcribe audio file using Sarvam AI Saaras v3
    
    Supported languages:
    - en-IN: English (India)
    - hi-IN: Hindi
    - ta-IN: Tamil
    - te-IN: Telugu
    - kn-IN: Kannada
    - ml-IN: Malayalam
    - mr-IN: Marathi
    - gu-IN: Gujarati
    
    Supported modes:
    - transcribe: Original language transcription (default)
    - translate: Translate to English
    - verbatim: Word-for-word transcription
    - translit: Romanization
    - codemix: Mixed script
    """
    
    try:
        # Read file bytes
        contents = await file.read()
        
        # Validate file size (max 10MB recommended)
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="File too large. Maximum size is 10MB."
            )
        
        # Transcribe using Sarvam
        transcript = sarvam_service.transcribe_from_bytes(contents, language, mode)
        
        if not transcript:
            raise HTTPException(
                status_code=500,
                detail="Failed to transcribe audio. Please check API key and try again."
            )
        
        return {
            "status": "success",
            "transcript": transcript,
            "language": language,
            "mode": mode,
            "model": "saaras:v3"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription error: {str(e)}"
        )

@router.post("/normalize")
async def normalize_text(
    text: str = Form(...), 
    language: str = Form("en")
):
    """
    Normalize transcribed text into structured health event
    
    This endpoint takes transcribed text and converts it into a structured
    health event (vital, symptom, medication, etc.) using the normalization service.
    
    Example inputs:
    - "My blood pressure is 140 over 90" → vital event
    - "I have a headache, severity 3" → symptom event
    - "I took my metformin" → medication event
    """
    from app.services.normalization import NormalizationAgent
    
    try:
        normalizer = NormalizationAgent()
        event_data = normalizer.normalize_event(text, language)
        
        return {
            "status": "success",
            "original_text": text,
            "normalized_event": event_data,
            "confidence": event_data.get("confidence", 0.5)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Normalization error: {str(e)}"
        )

@router.get("/transcribe/test")
async def test_transcription():
    """Test endpoint to verify Sarvam API connectivity"""
    try:
        # Check if API key is set
        api_key = os.getenv("SARVAM_API_KEY", "")
        if not api_key:
            return {
                "status": "error",
                "message": "SARVAM_API_KEY not configured. Please set it in your .env file.",
                "api_configured": False,
                "model": "saaras:v3"
            }
        
        # Try a simple test (this will fail but shows API is reachable)
        test_audio = b'\x52\x49\x46\x46'  # RIFF header (minimal WAV header)
        
        result = sarvam_service.transcribe_from_bytes(test_audio, "en-IN", "transcribe")
        
        return {
            "status": "ok" if result else "error",
            "message": "Sarvam AI service is reachable" if result else "API key may be invalid or service unavailable",
            "api_configured": bool(api_key),
            "model": "saaras:v3"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "api_configured": False,
            "model": "saaras:v3"
        }
