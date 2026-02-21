"""
Voice/Audio routes for transcription
"""
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from app.services.sarvam_service import SarvamService
import os
import tempfile

router = APIRouter()
sarvam_service = SarvamService()

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), language: str = Form("en-IN")):
    """
    Transcribe audio file using Sarvam AI
    
    Supported languages:
    - en-IN: English (India)
    - hi-IN: Hindi
    - ta-IN: Tamil
    - te-IN: Telugu
    - kn-IN: Kannada
    - ml-IN: Malayalam
    - mr-IN: Marathi
    - gu-IN: Gujarati
    """
    
    try:
        # Read file bytes
        contents = await file.read()
        
        # Transcribe using Sarvam
        transcript = sarvam_service.transcribe_from_bytes(contents, language)
        
        if not transcript:
            raise HTTPException(
                status_code=500,
                detail="Failed to transcribe audio. Please try again or check API key."
            )
        
        return {
            "status": "success",
            "transcript": transcript,
            "language": language,
            "duration": file.size  # Approximate size in bytes
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription error: {str(e)}"
        )

@router.get("/transcribe/test")
async def test_transcription():
    """Test endpoint to verify Sarvam API connectivity"""
    try:
        # Create a dummy test
        test_audio = b'\x52\x49\x46\x46'  # RIFF header
        
        result = sarvam_service.transcribe_from_bytes(test_audio, "en-IN")
        
        return {
            "status": "ok",
            "message": "Sarvam AI service is reachable",
            "api_configured": result is not None
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "api_configured": False
        }
