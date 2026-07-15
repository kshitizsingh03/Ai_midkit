import json
import logging
from sqlalchemy.orm import Session
from datetime import datetime, date
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

from app.config import settings
from app import models, schemas, crud
from app.agent import prompts

logger = logging.getLogger(__name__)

def clean_json_output(content: str) -> dict:
    """Helper to strip markdown backticks and load JSON safely."""
    content = content.strip()
    if content.startswith("```"):
        lines = content.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        content = "\n".join(lines).strip()
    return json.loads(content)

def call_groq_llm(system_prompt: str, user_prompt: str) -> str:
    """Helper to call Groq LLM with fallback from llama-3.3-70b-versatile to llama-3.1-8b-instant."""
    try:
        llm = ChatGroq(
            groq_api_key=settings.GROQ_API_KEY,
            model_name="llama-3.3-70b-versatile",
            temperature=0.0
        )
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        response = llm.invoke(messages)
        return response.content
    except Exception as e:
        logger.warning(f"Error calling llama-3.3-70b-versatile: {e}. Trying fallback llama-3.1-8b-instant.")
        try:
            llm = ChatGroq(
                groq_api_key=settings.GROQ_API_KEY,
                model_name="llama-3.1-8b-instant",
                temperature=0.0
            )
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            response = llm.invoke(messages)
            return response.content
        except Exception as e2:
            logger.error(f"Error calling fallback: {e2}")
            raise e2

# --- TOOL 1: Log Interaction ---
def log_interaction_tool(transcript: str) -> dict:
    """
    Triggered when: Sales representative submits natural language text in the Chat interface.
    Input: Meeting transcript or notes.
    Returns: A dictionary with extracted_data and ai_insights.
    """
    logger.info("Executing Tool: Log Interaction")
    raw_response = call_groq_llm(prompts.EXTRACTION_SYSTEM_PROMPT, f"Extract details from this meeting transcript:\n\n{transcript}")
    try:
        extracted = clean_json_output(raw_response)
        return extracted
    except Exception as e:
        logger.error(f"Failed to parse extraction output as JSON: {raw_response}. Error: {e}")
        raise ValueError("AI model output could not be parsed. Please try again.")

# --- TOOL 2: Edit Interaction ---
def edit_interaction_tool(db: Session, interaction_id: int, instruction: str) -> dict:
    """
    Triggered when: User types an instruction to modify an existing saved interaction.
    Input: The database ID of the interaction and natural language editing command.
    Returns: Updated interaction database record converted to dictionary.
    """
    logger.info(f"Executing Tool: Edit Interaction on ID {interaction_id}")
    
    # 1. Fetch from DB
    interaction = db.query(models.Interaction).filter(models.Interaction.id == interaction_id).first()
    if not interaction:
        raise ValueError(f"Interaction with ID {interaction_id} not found.")
    
    # 2. Serialize to dictionary
    current_data = {
        "Doctor Name": interaction.doctor_name,
        "Hospital Name": interaction.hospital_name,
        "Specialization": interaction.specialization,
        "Department": interaction.department,
        "Product Discussed": interaction.product_discussed,
        "Meeting Date": interaction.meeting_date.strftime("%Y-%m-%d") if interaction.meeting_date else None,
        "Meeting Time": interaction.meeting_time,
        "Interest Level": interaction.interest_level,
        "Meeting Notes": interaction.meeting_notes,
        "Action Items": interaction.action_items,
        "Follow-up Date": interaction.follow_up_date.strftime("%Y-%m-%d") if interaction.follow_up_date else None,
        "Doctor Requests": interaction.doctor_requests,
        "Competitor Mentioned": interaction.competitor_mentioned,
        "Additional Comments": interaction.additional_comments,
        "Representative Name": interaction.representative_name,
    }
    
    # 3. Request LLM update
    prompt_input = f"Current Data:\n{json.dumps(current_data, indent=2, default=str)}\n\nEdit Instruction:\n{instruction}"
    raw_response = call_groq_llm(prompts.EDIT_SYSTEM_PROMPT, prompt_input)
    
    try:
        updated_data = clean_json_output(raw_response)
        
        # 4. Save updates to database
        # Map fields back to model
        field_mapping = {
            "Doctor Name": "doctor_name",
            "Hospital Name": "hospital_name",
            "Specialization": "specialization",
            "Department": "department",
            "Product Discussed": "product_discussed",
            "Meeting Date": "meeting_date",
            "Meeting Time": "meeting_time",
            "Interest Level": "interest_level",
            "Meeting Notes": "meeting_notes",
            "Action Items": "action_items",
            "Follow-up Date": "follow_up_date",
            "Doctor Requests": "doctor_requests",
            "Competitor Mentioned": "competitor_mentioned",
            "Additional Comments": "additional_comments",
            "Representative Name": "representative_name",
        }
        
        for k, v in updated_data.items():
            db_field = field_mapping.get(k)
            if db_field:
                # Handle dates correctly
                if db_field in ["meeting_date", "follow_up_date"]:
                    if v:
                        setattr(interaction, db_field, datetime.strptime(v, "%Y-%m-%d").date())
                    else:
                        setattr(interaction, db_field, None)
                else:
                    setattr(interaction, db_field, v)
                    
        # Update doctor table representation if name or hospital changed
        if "Doctor Name" in updated_data or "Hospital Name" in updated_data:
            # Re-fetch/create doctor
            doctor = crud.get_or_create_doctor(
                db, 
                name=interaction.doctor_name, 
                hospital_name=interaction.hospital_name,
                specialization=interaction.specialization,
                department=interaction.department
            )
            interaction.doctor_id = doctor.id
            
        db.commit()
        db.refresh(interaction)
        
        # Return updated representation
        return {
            "id": interaction.id,
            "Doctor Name": interaction.doctor_name,
            "Hospital Name": interaction.hospital_name,
            "Specialization": interaction.specialization,
            "Department": interaction.department,
            "Product Discussed": interaction.product_discussed,
            "Meeting Date": interaction.meeting_date.strftime("%Y-%m-%d") if interaction.meeting_date else None,
            "Meeting Time": interaction.meeting_time,
            "Interest Level": interaction.interest_level,
            "Meeting Notes": interaction.meeting_notes,
            "Action Items": interaction.action_items,
            "Follow-up Date": interaction.follow_up_date.strftime("%Y-%m-%d") if interaction.follow_up_date else None,
            "Doctor Requests": interaction.doctor_requests,
            "Competitor Mentioned": interaction.competitor_mentioned,
            "Additional Comments": interaction.additional_comments,
            "Representative Name": interaction.representative_name,
            "sentiment": interaction.sentiment,
            "priority": interaction.priority,
            "risk_level": interaction.risk_level,
            "confidence_score": interaction.confidence_score,
            "meeting_summary": interaction.meeting_summary
        }
    except Exception as e:
        logger.error(f"Failed to edit interaction: {e}")
        db.rollback()
        raise ValueError(f"Could not apply edit instruction: {e}")

# --- TOOL 3: Search Doctor History ---
def search_doctor_history_tool(db: Session, doctor_name: str) -> list:
    """
    Triggered when: User/agent wants to review historical interactions with a doctor.
    Input: Doctor name (string).
    Returns: A list of dict summaries of previous meetings.
    """
    logger.info(f"Executing Tool: Search Doctor History for {doctor_name}")
    records = crud.get_interactions_by_doctor_name(db, doctor_name)
    
    formatted_history = []
    for r in records:
        formatted_history.append({
            "id": r.id,
            "doctor_name": r.doctor_name,
            "hospital_name": r.hospital_name,
            "product_discussed": r.product_discussed,
            "meeting_date": r.meeting_date.strftime("%Y-%m-%d"),
            "interest_level": r.interest_level,
            "sentiment": r.sentiment,
            "summary": r.meeting_summary or r.meeting_notes[:100] + "..." if r.meeting_notes else ""
        })
    return formatted_history

# --- TOOL 4: Generate Meeting Summary ---
def generate_meeting_summary_tool(interaction_data: dict) -> str:
    """
    Triggered when: A summary is needed for reporting or pipeline review.
    Input: Dict representing form data.
    Returns: Natural language summary string.
    """
    logger.info("Executing Tool: Generate Meeting Summary")
    user_prompt = f"Please summarize this interaction data:\n{json.dumps(interaction_data, indent=2, default=str)}"
    summary = call_groq_llm(prompts.SUMMARY_SYSTEM_PROMPT, user_prompt)
    return summary.strip()

# --- TOOL 5: Recommend Next Action ---
def recommend_next_action_tool(interaction_data: dict) -> str:
    """
    Triggered when: Providing immediate suggestions to sales reps in AI insights.
    Input: Dict representing form data.
    Returns: Suggested next actions list (text string).
    """
    logger.info("Executing Tool: Recommend Next Action")
    user_prompt = f"Analyze this interaction and recommend next actions:\n{json.dumps(interaction_data, indent=2, default=str)}"
    recommendation = call_groq_llm(prompts.RECOMMENDATION_SYSTEM_PROMPT, user_prompt)
    return recommendation.strip()
