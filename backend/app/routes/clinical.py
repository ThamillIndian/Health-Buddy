"""
Clinical validation routes - provides credibility and data source information
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.clinical_validator import ClinicalValidator
from typing import Optional

router = APIRouter()
validator = ClinicalValidator()

@router.get("/clinical/references")
async def get_clinical_references():
    """Get all clinical references and sources used in app"""
    return validator.get_clinical_references()

@router.post("/clinical/validate/glucose")
async def validate_glucose(value: float, condition: str = "diabetes"):
    """Validate glucose value against clinical standards (IDA)"""
    return validator.validate_glucose(value, condition)

@router.post("/clinical/validate/bp")
async def validate_bp(systolic: float, diastolic: float):
    """Validate blood pressure against clinical standards (ESC/ESH)"""
    return validator.validate_bp(systolic, diastolic)

@router.post("/clinical/validate/adherence")
async def validate_adherence(taken: int, prescribed: int):
    """Calculate adherence percentage (WHO Standards)"""
    return validator.validate_adherence(taken, prescribed)

@router.post("/clinical/validate/drug")
async def validate_drug(drug_name: str):
    """Check if drug is FDA approved"""
    return validator.validate_drug(drug_name)

@router.get("/clinical/disclaimer")
async def get_disclaimer():
    """Get clinical disclaimer text"""
    from app.constants.clinical_standards import CLINICAL_DISCLAIMER
    return {"disclaimer": CLINICAL_DISCLAIMER}
