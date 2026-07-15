import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app import schemas, crud, models
from app.database import get_db
from app.agent.graph import graph
from app.agent.tools import (
    generate_meeting_summary_tool, 
    recommend_next_action_tool, 
    search_doctor_history_tool,
    edit_interaction_tool
)
from langchain_core.messages import HumanMessage

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/interaction/manual", response_model=schemas.InteractionResponse)
def save_manual_interaction(payload: schemas.InteractionCreate, db: Session = Depends(get_db)):
    """Saves a manually filled interaction form directly to the database.
    This must succeed even if the Groq API is unreachable/rate-limited — manual entry
    should never depend on AI availability."""
    try:
        data_dict = payload.model_dump(by_alias=True)

        # Try to enrich with AI-generated summary/recommendations, but never block the save on it
        summary = "Manually logged interaction."
        try:
            summary = generate_meeting_summary_tool(data_dict)
        except Exception as e:
            logger.warning(f"AI summary generation failed for manual save, using fallback: {e}")

        sentiment = "Positive" if "interested" in str(payload.meeting_notes).lower() else "Neutral"
        priority = "High" if payload.follow_up_date else "Medium"

        insights = schemas.AIInsights(
            sentiment=sentiment,
            priority=priority,
            risk_level="Low",
            confidence_score=1.0,
            meeting_summary=summary
        )

        db_interaction = crud.create_interaction(db, item=payload, ai_insights=insights)
        return db_interaction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/interaction/chat", response_model=schemas.ChatResponse)
def process_chat_transcript(payload: schemas.ChatRequest):
    """Processes chat transcript via LangGraph extraction and returns staging data."""
    try:
        inputs = {
            "messages": [HumanMessage(content=payload.text)],
            "current_data": payload.current_data,
            "ai_insights": payload.ai_insights
        }
        res = graph.invoke(inputs)
        
        if res.get("error"):
            raise HTTPException(status_code=400, detail=res["error"])
            
        extracted_data = res.get("extracted_data")
        ai_insights = res.get("ai_insights")
        
        message = None
        if res.get("messages"):
            message = res["messages"][-1].content
            
        return schemas.ChatResponse(
            extracted_data=schemas.InteractionStaged(**extracted_data) if extracted_data else None,
            ai_insights=schemas.AIInsights(**ai_insights) if ai_insights else None,
            message=message,
            doctor_history=res.get("doctor_history")
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/interaction/save", response_model=schemas.InteractionResponse)
def save_reviewed_interaction(payload: schemas.ChatResponse, db: Session = Depends(get_db)):
    """Persists reviewed and edited data (originally from chat extraction) to the database.
    If payload.id is provided, updates that existing record instead of creating a duplicate."""
    try:
        item_create = schemas.InteractionCreate(**payload.extracted_data.model_dump(by_alias=True))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Please fill in all required fields (Doctor Name, Hospital Name, Product Discussed, Meeting Date) before saving. Details: {str(e)}")

    try:
        if payload.id:
            db_interaction = crud.update_interaction(db, interaction_id=payload.id, item=item_create, ai_insights=payload.ai_insights)
            if not db_interaction:
                raise HTTPException(status_code=404, detail=f"Interaction with ID {payload.id} not found.")
        else:
            db_interaction = crud.create_interaction(db, item=item_create, ai_insights=payload.ai_insights)
        return db_interaction
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/interaction/edit/{id}", response_model=schemas.ChatResponse)
def edit_existing_interaction(id: int, payload: schemas.EditRequest, db: Session = Depends(get_db)):
    """Edits an existing interaction using the Edit Interaction tool and LLM instruction interpretation."""
    try:
        inputs = {
            "messages": [HumanMessage(content=payload.instruction)],
            "interaction_id": id
        }
        res = graph.invoke(inputs)
        
        if res.get("error"):
            raise HTTPException(status_code=400, detail=res["error"])
            
        extracted_data = res.get("extracted_data")
        ai_insights = res.get("ai_insights")
        
        message = f"Successfully updated the fields as requested: '{payload.instruction}'."
        
        return schemas.ChatResponse(
            extracted_data=schemas.InteractionStaged(**extracted_data) if extracted_data else None,
            ai_insights=schemas.AIInsights(**ai_insights) if ai_insights else None,
            message=message,
            id=res.get("interaction_id") or id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Edit failed: {str(e)}")

@router.get("/interaction/{id}", response_model=schemas.InteractionResponse)
def get_interaction_by_id(id: int, db: Session = Depends(get_db)):
    """Fetches details of a single logged interaction."""
    db_interaction = crud.get_interaction(db, interaction_id=id)
    if not db_interaction:
        raise HTTPException(status_code=404, detail="Interaction not found.")
    return db_interaction

@router.get("/doctor/history", response_model=List[dict])
def get_doctor_history(doctor_name: str = Query(..., alias="doctor_name"), db: Session = Depends(get_db)):
    """Fetches past interaction summaries for a given doctor name using the Search Doctor History tool."""
    try:
        history = search_doctor_history_tool(db, doctor_name)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/summary")
def generate_meeting_summary(payload: schemas.InteractionBase):
    """Routes to the Generate Meeting Summary tool to get an immediate summary of current form data."""
    try:
        data_dict = payload.model_dump(by_alias=True)
        summary = generate_meeting_summary_tool(data_dict)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recommendation", response_model=schemas.RecommendationResponse)
def recommend_next_action(payload: schemas.InteractionBase):
    """Routes to the Recommend Next Action tool to get suggestions based on current form data."""
    try:
        data_dict = payload.model_dump(by_alias=True)
        rec = recommend_next_action_tool(data_dict)
        return schemas.RecommendationResponse(recommendation=rec)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/interactions", response_model=List[schemas.InteractionResponse])
def get_interactions(limit: int = 100, db: Session = Depends(get_db)):
    """Fetches all logged interactions from the database, ordered by date."""
    try:
        return crud.get_all_interactions(db, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
