from typing import TypedDict, List, Optional, Any
from langchain_core.messages import BaseMessage

class AgentState(TypedDict):
    messages: List[BaseMessage]
    extracted_data: Optional[dict]
    ai_insights: Optional[dict]
    doctor_history: Optional[List[dict]]
    recommendation: Optional[str]
    meeting_summary: Optional[str]
    interaction_id: Optional[int]
    error: Optional[str]
