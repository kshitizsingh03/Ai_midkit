from sqlalchemy import Column, Integer, String, Text, Date, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Hospital(Base):
    __tablename__ = "hospitals"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

class Doctor(Base):
    __tablename__ = "doctors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    specialization = Column(String, nullable=True)
    department = Column(String, nullable=True)
    hospital_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    interactions = relationship("Interaction", back_populates="doctor")

class Interaction(Base):
    __tablename__ = "interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    doctor_name = Column(String, nullable=False)
    hospital_name = Column(String, nullable=False)
    specialization = Column(String, nullable=True)
    department = Column(String, nullable=True)
    product_discussed = Column(String, nullable=False)
    meeting_date = Column(Date, nullable=False)
    meeting_time = Column(String, nullable=True)
    interest_level = Column(String, nullable=True) # Low, Medium, High
    meeting_notes = Column(Text, nullable=True)
    action_items = Column(Text, nullable=True)
    follow_up_date = Column(Date, nullable=True)
    doctor_requests = Column(Text, nullable=True)
    competitor_mentioned = Column(String, nullable=True)
    additional_comments = Column(Text, nullable=True)
    representative_name = Column(String, nullable=True)
    
    # AI Insights
    sentiment = Column(String, nullable=True)
    priority = Column(String, nullable=True)
    risk_level = Column(String, nullable=True)
    confidence_score = Column(Float, nullable=True)
    meeting_summary = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    doctor = relationship("Doctor", back_populates="interactions")
