from datetime import date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class SubmissionCreate(BaseModel):
    model_config = ConfigDict(extra="allow")

    demographics: Dict[str, Any] = {}
    answers: Dict[str, Any]
    primary_goals: List[str] = []
    region_preference: str  # "South Indian" | "North Indian" | "East Indian" | "West Indian"
    diet_type: str  # "Vegetarian" | "Non-Vegetarian" | "Vegan"


class SubmissionResult(BaseModel):
    id: str
    created_at: str
    scores: Dict[str, Any]
    classification: Dict[str, Any]
    recommendation: Dict[str, Any]
    questionnaire_version: str

    model_config = ConfigDict(from_attributes=True)


class RegistrationCreate(BaseModel):
    model_config = ConfigDict(extra="allow")

    full_name: str
    email: str
    dob: Optional[date] = None
    age: Optional[int] = None
    demographics: Dict[str, Any] = {}
    region_preference: Optional[str] = None
    diet_type: Optional[str] = None
    extracted_report: Optional[Dict[str, Any]] = None


class RegistrationResult(BaseModel):
    id: str
    created_at: str
    full_name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class FeedbackCreate(BaseModel):
    rating: Optional[int] = None
    comments: str
    context: Optional[str] = None
    contact_email: Optional[str] = None


class FeedbackResult(BaseModel):
    id: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)
