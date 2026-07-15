from langgraph.graph import StateGraph, END
from app.agent.state import AgentState
from app.agent.tools import (
    log_interaction_tool, 
    edit_interaction_tool, 
    search_doctor_history_tool, 
    generate_meeting_summary_tool, 
    recommend_next_action_tool,
    call_groq_llm
)
import json
from langchain_core.messages import HumanMessage, AIMessage

def route_input(state: AgentState):
    """
    Evaluates representative message input and routes to the correct tool/node.
    """
    if not state.get("messages"):
        return "extractor"
        
    last_msg = state["messages"][-1].content.strip()
    
    # Check if we have current staged data in-memory
    has_staged = False
    current_data = state.get("current_data")
    if current_data:
        has_staged = any(v for k, v in current_data.items() if v)
        
    # LLM Router
    router_prompt = f"""
    Analyze the user request and determine the user's intent.
    Choose exactly one of the following intents:
    - "extractor": logging a new meeting, note, or transcript (e.g. "I met Dr. X today at Y, discussed Z...")
    - "editor": editing/correcting details of the current meeting or staged fields (e.g. "change doctor name to Dr. Smith", "no, the hospital is Apollo", "change the follow-up date", "it was at 10 AM, not 11 AM", "correct the name to Sharma", "actually the product was CardioPlus")
    - "history": searching for past meetings or history of a doctor (e.g. "what is the history of Dr. Sharma?", "show previous meetings with Dr. Jones")
    - "general": general chatting, greetings, or questions about how to use the system.
    
    Current state has staged data: {has_staged}
    
    Return ONLY a single word: extractor, editor, history, or general.
    """
    
    try:
        decision = call_groq_llm(router_prompt, last_msg).lower().strip()
        if "extractor" in decision:
            return "extractor"
        elif "editor" in decision:
            return "editor"
        elif "history" in decision:
            return "history"
        elif "general" in decision:
            return "general"
        else:
            # fallback keyword mapping
            msg_lower = last_msg.lower()
            if any(w in msg_lower for w in ["change", "edit", "update", "modify", "correct", "no, it", "no, the", "actually"]):
                return "editor"
            elif any(w in msg_lower for w in ["history", "previous", "past", "records"]):
                return "history"
            return "extractor"
    except Exception:
        # fallback rules
        msg_lower = last_msg.lower()
        if any(w in msg_lower for w in ["change", "edit", "update", "modify", "correct", "no, it", "no, the", "actually"]):
            return "editor"
        elif any(w in msg_lower for w in ["history", "previous", "past", "records"]):
            return "history"
        return "extractor"

def extractor_node(state: AgentState):
    """Logs a new interaction by extracting fields, then auto-generating recommendations."""
    last_msg = state["messages"][-1].content
    try:
        extracted = log_interaction_tool(last_msg)
        extracted_data = extracted.get("extracted_data", {})
        ai_insights = extracted.get("ai_insights", {})
        
        # Enforce all required fields exist
        # If the LLM didn't return some keys, we add default None
        form_keys = [
            "Doctor Name", "Hospital Name", "Specialization", "Department",
            "Product Discussed", "Meeting Date", "Meeting Time", "Interest Level",
            "Meeting Notes", "Action Items", "Follow-up Date", "Doctor Requests",
            "Competitor Mentioned", "Additional Comments", "Representative Name"
        ]
        for key in form_keys:
            if key not in extracted_data:
                extracted_data[key] = None
                
        # Generate recommendations and summary using tools
        recommendations = recommend_next_action_tool(extracted_data)
        
        # Update insights
        ai_insights["Next Action Recommendation"] = recommendations
        
        return {
            "extracted_data": extracted_data,
            "ai_insights": ai_insights,
            "meeting_summary": ai_insights.get("Meeting Summary"),
            "recommendation": recommendations
        }
    except Exception as e:
        return {"error": str(e)}

def editor_node(state: AgentState):
    """Processes a natural language update instruction for an existing interaction or in-memory staged data."""
    last_msg = state["messages"][-1].content
    current_data = state.get("current_data")
    
    # If we have current_data passed from the frontend, we edit it in-memory
    if current_data:
        try:
            # Let's call the Groq LLM using the edit prompt
            prompt_input = f"Current Data:\n{json.dumps(current_data, indent=2, default=str)}\n\nEdit Instruction:\n{last_msg}"
            raw_response = call_groq_llm(prompts.EDIT_SYSTEM_PROMPT, prompt_input)
            updated_data = clean_json_output(raw_response)
            
            # Recalculate summary and recommendations based on the updated data
            summary = generate_meeting_summary_tool(updated_data)
            recommendations = recommend_next_action_tool(updated_data)
            
            # Get old insights or create new ones
            old_insights = state.get("ai_insights") or {}
            sentiment = "Positive" if "interested" in str(updated_data.get("Meeting Notes") or "").lower() else old_insights.get("Sentiment", "Neutral")
            
            ai_insights = {
                "Sentiment": sentiment,
                "Priority": updated_data.get("Follow-up Date") and "High" or "Medium",
                "Risk Level": old_insights.get("Risk Level", "Low"),
                "Confidence Score": 1.0,
                "Meeting Summary": summary,
                "Next Action Recommendation": recommendations
            }
            
            message = f"I've updated the form fields according to your request: '{last_msg}'."
            
            from langchain_core.messages import AIMessage
            return {
                "extracted_data": updated_data,
                "ai_insights": ai_insights,
                "meeting_summary": summary,
                "recommendation": recommendations,
                "messages": [AIMessage(content=message)]
            }
        except Exception as e:
            return {"error": f"Staged edit failed: {str(e)}"}
            
    # Fallback to database edit
    editor_parser_prompt = """
    Analyze the user instruction to edit an interaction.
    Extract:
    1. The interaction ID (integer). If not mentioned, return null.
    2. The clean editing instruction (string).
    
    Return ONLY a valid JSON:
    {
      "interaction_id": int or null,
      "instruction": "string"
    }
    """
    
    try:
        from app.database import SessionLocal
        db = SessionLocal()
        
        parsed_str = call_groq_llm(editor_parser_prompt, last_msg)
        parsed = json.loads(parsed_str.strip())
        
        interaction_id = state.get("interaction_id") or parsed.get("interaction_id")
        instruction = parsed.get("instruction", last_msg)
        
        if not interaction_id:
            # Fallback to the latest logged interaction if ID is missing
            import app.models as models
            last_record = db.query(models.Interaction).order_by(models.Interaction.id.desc()).first()
            if last_record:
                interaction_id = last_record.id
            else:
                db.close()
                return {"error": "No interaction ID specified and no records exist."}
                
        updated_dict = edit_interaction_tool(db, interaction_id, instruction)
        db.close()
        
        # Map fields back to match frontend React expectation
        extracted_data = {
            "Doctor Name": updated_dict.get("Doctor Name"),
            "Hospital Name": updated_dict.get("Hospital Name"),
            "Specialization": updated_dict.get("Specialization"),
            "Department": updated_dict.get("Department"),
            "Product Discussed": updated_dict.get("Product Discussed"),
            "Meeting Date": updated_dict.get("Meeting Date"),
            "Meeting Time": updated_dict.get("Meeting Time"),
            "Interest Level": updated_dict.get("Interest Level"),
            "Meeting Notes": updated_dict.get("Meeting Notes"),
            "Action Items": updated_dict.get("Action Items"),
            "Follow-up Date": updated_dict.get("Follow-up Date"),
            "Doctor Requests": updated_dict.get("Doctor Requests"),
            "Competitor Mentioned": updated_dict.get("Competitor Mentioned"),
            "Additional Comments": updated_dict.get("Additional Comments"),
            "Representative Name": updated_dict.get("Representative Name"),
        }
        
        ai_insights = {
            "Sentiment": updated_dict.get("sentiment"),
            "Priority": updated_dict.get("priority"),
            "Risk Level": updated_dict.get("risk_level"),
            "Confidence Score": updated_dict.get("confidence_score"),
            "Meeting Summary": updated_dict.get("meeting_summary"),
        }
        
        # Regenerate recommendation for the updated record
        rec = recommend_next_action_tool(extracted_data)
        ai_insights["Next Action Recommendation"] = rec
        
        return {
            "extracted_data": extracted_data,
            "ai_insights": ai_insights,
            "interaction_id": interaction_id,
            "meeting_summary": updated_dict.get("meeting_summary"),
            "recommendation": rec
        }
    except Exception as e:
        return {"error": f"Edit failed: {str(e)}"}

def history_node(state: AgentState):
    """Searches doctor history and returns a list of previous interactions."""
    last_msg = state["messages"][-1].content
    parser_prompt = """
    Extract the doctor name mentioned in the query.
    Return ONLY the doctor's name (e.g. "Dr. Sharma" or "Sharma"). Do not include any other text.
    """
    try:
        from app.database import SessionLocal
        db = SessionLocal()
        doc_name = call_groq_llm(parser_prompt, last_msg).strip()
        history = search_doctor_history_tool(db, doc_name)
        db.close()
        
        # Return results in the state
        return {
            "doctor_history": history,
            "messages": [AIMessage(content=f"Here is the history for doctor: {doc_name}")]
        }
    except Exception as e:
        return {"error": f"History search failed: {str(e)}"}

def general_node(state: AgentState):
    """Handles standard questions or greets the representative."""
    last_msg = state["messages"][-1].content
    try:
        reply = call_groq_llm("You are a helpful assistant for a Medical Representative CRM. Explain what you can do (log meetings, edit them, search history, generate recommendations) in a friendly and professional manner.", last_msg)
        return {
            "messages": [AIMessage(content=reply)]
        }
    except Exception as e:
        return {"error": str(e)}

# Graph Setup
builder = StateGraph(AgentState)

builder.add_node("extractor", extractor_node)
builder.add_node("editor", editor_node)
builder.add_node("history", history_node)
builder.add_node("general", general_node)

builder.set_conditional_entry_point(
    route_input,
    {
        "extractor": "extractor",
        "editor": "editor",
        "history": "history",
        "general": "general"
    }
)

builder.add_edge("extractor", END)
builder.add_edge("editor", END)
builder.add_edge("history", END)
builder.add_edge("general", END)

graph = builder.compile()
