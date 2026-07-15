from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
import datetime

# Hospital Schemas
class HospitalBase(BaseModel):
    name: str

class HospitalCreate(HospitalBase):
    pass

class Hospital(HospitalBase):
    id: int
    class Config:
        from_attributes = True

# Product Schemas
class ProductBase(BaseModel):
    name: str

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    class Config:
        from_attributes = True

# Doctor Schemas
class DoctorBase(BaseModel):
    name: str
    specialization: Optional[str] = None
    department: Optional[str] = None
    hospital_name: str

class DoctorCreate(DoctorBase):
    pass

class Doctor(DoctorBase):
    id: int
    created_at: datetime.datetime
    class Config:
        from_attributes = True

# Interaction Schemas
class InteractionStaged(BaseModel):
    """Lenient schema used ONLY for displaying/staging AI-extracted or in-progress data.
    All fields optional here because a chat transcript may not mention every field —
    the rep fills in the rest manually before the final Save. Required-field validation
    happens only at InteractionCreate (used by /interaction/manual and /interaction/save)."""
    doctor_name: Optional[str] = Field(None, alias="Doctor Name")
    hospital_name: Optional[str] = Field(None, alias="Hospital Name")
    specialization: Optional[str] = Field(None, alias="Specialization")
    department: Optional[str] = Field(None, alias="Department")
    product_discussed: Optional[str] = Field(None, alias="Product Discussed")
    meeting_date: Optional[datetime.date] = Field(None, alias="Meeting Date")
    meeting_time: Optional[str] = Field(None, alias="Meeting Time")
    interest_level: Optional[str] = Field(None, alias="Interest Level")
    meeting_notes: Optional[str] = Field(None, alias="Meeting Notes")
    action_items: Optional[str] = Field(None, alias="Action Items")
    follow_up_date: Optional[datetime.date] = Field(None, alias="Follow-up Date")
    doctor_requests: Optional[str] = Field(None, alias="Doctor Requests")
    competitor_mentioned: Optional[str] = Field(None, alias="Competitor Mentioned")
    additional_comments: Optional[str] = Field(None, alias="Additional Comments")
    representative_name: Optional[str] = Field(None, alias="Representative Name")

    @model_validator(mode='before')
    @classmethod
    def clean_empty_strings(cls, data):
        if isinstance(data, dict):
            return {k: (None if v == "" else v) for k, v in data.items()}
        return data

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime.date: lambda v: v.strftime("%Y-%m-%d")
        }

class InteractionBase(BaseModel):
    doctor_name: str = Field(..., alias="Doctor Name")
    hospital_name: str = Field(..., alias="Hospital Name")
    specialization: Optional[str] = Field(None, alias="Specialization")
    department: Optional[str] = Field(None, alias="Department")
    product_discussed: str = Field(..., alias="Product Discussed")
    meeting_date: datetime.date = Field(..., alias="Meeting Date")
    meeting_time: Optional[str] = Field(None, alias="Meeting Time")
    interest_level: Optional[str] = Field(None, alias="Interest Level")
    meeting_notes: Optional[str] = Field(None, alias="Meeting Notes")
    action_items: Optional[str] = Field(None, alias="Action Items")
    follow_up_date: Optional[datetime.date] = Field(None, alias="Follow-up Date")
    doctor_requests: Optional[str] = Field(None, alias="Doctor Requests")
    competitor_mentioned: Optional[str] = Field(None, alias="Competitor Mentioned")
    additional_comments: Optional[str] = Field(None, alias="Additional Comments")
    representative_name: Optional[str] = Field(None, alias="Representative Name")

    @model_validator(mode='before')
    @classmethod
    def clean_empty_strings(cls, data):
        if isinstance(data, dict):
            return {k: (None if v == "" else v) for k, v in data.items()}
        return data

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime.date: lambda v: v.strftime("%Y-%m-%d")
        }

class InteractionCreate(InteractionBase):
    # Field mapping for backend persistence
    pass

class AIInsights(BaseModel):
    sentiment: Optional[str] = Field(None, alias="Sentiment")
    priority: Optional[str] = Field(None, alias="Priority")
    risk_level: Optional[str] = Field(None, alias="Risk Level")
    confidence_score: Optional[float] = Field(None, alias="Confidence Score")
    meeting_summary: Optional[str] = Field(None, alias="Meeting Summary")

    class Config:
        populate_by_name = True

# Response format for Chat endpoint
class ChatResponse(BaseModel):
    extracted_data: Optional[InteractionStaged] = None
    ai_insights: Optional[AIInsights] = None
    message: Optional[str] = None
    id: Optional[int] = None
    doctor_history: Optional[List[dict]] = None

    class Config:
        populate_by_name = True

class InteractionResponse(InteractionBase):
    id: int
    doctor_id: int
    sentiment: Optional[str] = None
    priority: Optional[str] = None
    risk_level: Optional[str] = None
    confidence_score: Optional[float] = None
    meeting_summary: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# API Request Payloads
class ChatRequest(BaseModel):
    text: str
    current_data: Optional[dict] = None
    ai_insights: Optional[dict] = None

class EditRequest(BaseModel):
    instruction: str

class SummaryRequest(BaseModel):
    interaction_id: Optional[int] = None
    interaction_data: Optional[dict] = None

class RecommendationRequest(BaseModel):
    interaction_id: Optional[int] = None
    interaction_data: Optional[dict] = None

class RecommendationResponse(BaseModel):
    recommendation: str
