from sqlalchemy.orm import Session
from app import models, schemas
from datetime import date

def get_doctor_by_name_and_hospital(db: Session, name: str, hospital_name: str):
    return db.query(models.Doctor).filter(
        models.Doctor.name.ilike(name),
        models.Doctor.hospital_name.ilike(hospital_name)
    ).first()

def get_or_create_doctor(db: Session, name: str, hospital_name: str, specialization: str = None, department: str = None):
    doc = get_doctor_by_name_and_hospital(db, name, hospital_name)
    if not doc:
        doc = models.Doctor(
            name=name,
            hospital_name=hospital_name,
            specialization=specialization,
            department=department
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
    else:
        updated = False
        if specialization and not doc.specialization:
            doc.specialization = specialization
            updated = True
        if department and not doc.department:
            doc.department = department
            updated = True
        if updated:
            db.commit()
            db.refresh(doc)
    return doc

def get_or_create_hospital(db: Session, name: str):
    hosp = db.query(models.Hospital).filter(models.Hospital.name.ilike(name)).first()
    if not hosp:
        hosp = models.Hospital(name=name)
        db.add(hosp)
        db.commit()
        db.refresh(hosp)
    return hosp

def get_or_create_product(db: Session, name: str):
    prod = db.query(models.Product).filter(models.Product.name.ilike(name)).first()
    if not prod:
        prod = models.Product(name=name)
        db.add(prod)
        db.commit()
        db.refresh(prod)
    return prod

def create_interaction(db: Session, item: schemas.InteractionCreate, ai_insights: schemas.AIInsights = None):
    # Get or create doctor
    doctor = get_or_create_doctor(
        db, 
        name=item.doctor_name, 
        hospital_name=item.hospital_name,
        specialization=item.specialization,
        department=item.department
    )
    
    # Store hospital and product reference
    get_or_create_hospital(db, item.hospital_name)
    get_or_create_product(db, item.product_discussed)
    
    db_interaction = models.Interaction(
        doctor_id=doctor.id,
        doctor_name=item.doctor_name,
        hospital_name=item.hospital_name,
        specialization=item.specialization,
        department=item.department,
        product_discussed=item.product_discussed,
        meeting_date=item.meeting_date,
        meeting_time=item.meeting_time,
        interest_level=item.interest_level,
        meeting_notes=item.meeting_notes,
        action_items=item.action_items,
        follow_up_date=item.follow_up_date,
        doctor_requests=item.doctor_requests,
        competitor_mentioned=item.competitor_mentioned,
        additional_comments=item.additional_comments,
        representative_name=item.representative_name,
        
        # AI Insights
        sentiment=ai_insights.sentiment if ai_insights else None,
        priority=ai_insights.priority if ai_insights else None,
        risk_level=ai_insights.risk_level if ai_insights else None,
        confidence_score=ai_insights.confidence_score if ai_insights else None,
        meeting_summary=ai_insights.meeting_summary if ai_insights else None
    )
    
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    return db_interaction

def update_interaction(db: Session, interaction_id: int, item: schemas.InteractionCreate, ai_insights: schemas.AIInsights = None):
    """Updates an existing interaction record in place instead of creating a duplicate."""
    db_interaction = db.query(models.Interaction).filter(models.Interaction.id == interaction_id).first()
    if not db_interaction:
        return None

    # Keep doctor/hospital/product reference tables in sync
    doctor = get_or_create_doctor(
        db,
        name=item.doctor_name,
        hospital_name=item.hospital_name,
        specialization=item.specialization,
        department=item.department
    )
    get_or_create_hospital(db, item.hospital_name)
    get_or_create_product(db, item.product_discussed)

    db_interaction.doctor_id = doctor.id
    db_interaction.doctor_name = item.doctor_name
    db_interaction.hospital_name = item.hospital_name
    db_interaction.specialization = item.specialization
    db_interaction.department = item.department
    db_interaction.product_discussed = item.product_discussed
    db_interaction.meeting_date = item.meeting_date
    db_interaction.meeting_time = item.meeting_time
    db_interaction.interest_level = item.interest_level
    db_interaction.meeting_notes = item.meeting_notes
    db_interaction.action_items = item.action_items
    db_interaction.follow_up_date = item.follow_up_date
    db_interaction.doctor_requests = item.doctor_requests
    db_interaction.competitor_mentioned = item.competitor_mentioned
    db_interaction.additional_comments = item.additional_comments
    db_interaction.representative_name = item.representative_name

    if ai_insights:
        db_interaction.sentiment = ai_insights.sentiment
        db_interaction.priority = ai_insights.priority
        db_interaction.risk_level = ai_insights.risk_level
        db_interaction.confidence_score = ai_insights.confidence_score
        db_interaction.meeting_summary = ai_insights.meeting_summary

    db.commit()
    db.refresh(db_interaction)
    return db_interaction

def get_interaction(db: Session, interaction_id: int):
    return db.query(models.Interaction).filter(models.Interaction.id == interaction_id).first()

def get_all_interactions(db: Session, limit: int = 100):
    return db.query(models.Interaction).order_by(models.Interaction.meeting_date.desc()).limit(limit).all()

def get_interactions_by_doctor_name(db: Session, doctor_name: str):
    return db.query(models.Interaction).filter(
        models.Interaction.doctor_name.ilike(f"%{doctor_name}%")
    ).order_by(models.Interaction.meeting_date.desc()).all()
