import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.router import router
from app import models
from datetime import date

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI-First HCP CRM - Log Interaction Screen API",
    description="Backend API for life science CRM Log Interaction screen using FastAPI, LangGraph, and Groq LLM."
)

# Enable CORS for frontend web access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def seed_db():
    """Seeds some initial test data to make the app demonstration complete and ready-to-run."""
    db = SessionLocal()
    try:
        # Check if database is already seeded
        if db.query(models.Doctor).first() is not None:
            return
            
        print("Seeding database with demonstration data...")
        
        # Seed Products
        products = ["CardioPlus", "NeuroShield", "OncoFree", "DiabeStop"]
        for p_name in products:
            db.add(models.Product(name=p_name))
            
        # Seed Hospitals
        hospitals = ["Apollo Hospital", "General Hospital", "City Cancer Center"]
        for h_name in hospitals:
            db.add(models.Hospital(name=h_name))
            
        # Seed Doctors
        doc1 = models.Doctor(
            name="Dr. Sharma",
            specialization="Cardiology",
            department="Cardiology Dept",
            hospital_name="Apollo Hospital"
        )
        doc2 = models.Doctor(
            name="Dr. Jones",
            specialization="Neurology",
            department="Neurology Dept",
            hospital_name="General Hospital"
        )
        doc3 = models.Doctor(
            name="Dr. Smith",
            specialization="Oncology",
            department="Oncology Dept",
            hospital_name="City Cancer Center"
        )
        db.add_all([doc1, doc2, doc3])
        db.commit()
        
        # Seed an interaction for Dr. Sharma to showcase history tool
        past_interaction = models.Interaction(
            doctor_id=doc1.id,
            doctor_name=doc1.name,
            hospital_name=doc1.hospital_name,
            specialization=doc1.specialization,
            department=doc1.department,
            product_discussed="CardioPlus",
            meeting_date=date(2026, 6, 15),
            meeting_time="10:30 AM",
            interest_level="High",
            meeting_notes="Dr. Sharma was positive about CardioPlus efficacy reports. Asked for safety trial clinical papers.",
            action_items="Email safety clinical papers to Dr. Sharma.",
            follow_up_date=date(2026, 7, 20),
            doctor_requests="Clinical trial papers on safety.",
            competitor_mentioned="CardioMax",
            additional_comments="He was in a hurry but promised to review the documentation.",
            representative_name="Rep Alex",
            sentiment="Positive",
            priority="High",
            risk_level="Low",
            confidence_score=0.98,
            meeting_summary="Met Dr. Sharma at Apollo Hospital to discuss CardioPlus. He showed positive interest, requested safety trial clinical papers, and suggested follow-up by late July."
        )
        db.add(past_interaction)
        db.commit()
        print("Database seeded successfully!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

# Seed database on startup
@app.on_event("startup")
def startup_event():
    seed_db()

# Include routes
app.include_router(router)

@app.get("/")
def read_root():
    return {"message": "AI-First HCP CRM Log Interaction Screen API is running. Go to /docs for OpenAPI documentation."}
