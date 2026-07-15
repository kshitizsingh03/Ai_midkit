# Mediket AI-CRM (HCP Module - Log Interaction Screen)

Mediket AI-CRM is a focused, production-quality medical representative utility for logging Healthcare Professional (HCP) interactions. It is designed to minimize administrative friction by providing reps with two logging modes side-by-side: a **structured, manual form** and a **conversational AI assistant** (text or voice) that parses meeting summaries using LangGraph and Groq LLM extraction.

---

## 🔧 Recent Fixes & Updates
* Fixed Groq model priority: `gemma2-9b-it` is now correctly used as the primary model, with `llama-3.3-70b-versatile` as fallback (previously reversed).
* Fixed a bug where saving an already-staged/edited interaction created a **duplicate** database row instead of updating the existing one.
* Fixed a bug where chat extraction would return a hard 500 error if the AI didn't catch every required field — partial extractions now stage cleanly, and the rep fills in any gaps manually before Save.
* Fixed manual form save so it **no longer depends on the Groq API being available** — manual entry now always works even if the AI service is down or rate-limited.
* Fixed a hardcoded date in the AI prompts that would have made "today"/"next week" resolve incorrectly after a certain date.
* **Added voice input**: click the mic icon in the Chat tab to speak your meeting notes using the browser's built-in Web Speech API (no paid speech-to-text service) — the transcript auto-fills and auto-sends once you stop speaking.

---

## Technical Stack
* **Frontend**: React (Vite), Redux Toolkit (state management), Tailwind CSS v3 (styling), Axios (API requests), Google Inter Font, Lucide Icons
* **Backend**: FastAPI (Python), SQLAlchemy (ORM), LangGraph (Agent Framework), LangChain (Groq Integration)
* **Database**: PostgreSQL (SQLAlchemy sync connection) with automatic fallback to **SQLite** (`sqlite:///./mediket.db`) for easy setup and local testing
* **AI Model**: Groq API `gemma2-9b-it` (fallback to `llama-3.3-70b-versatile` on rate limits or API issues)

---

## Folder Structure
```
mediket/
├── README.md
├── .env.example
├── backend/
│   ├── app/
│   │   ├── agent/           # LangGraph Agent & Tools
│   │   │   ├── state.py
│   │   │   ├── prompts.py
│   │   │   ├── tools.py     # 5 Core CRM Tools
│   │   │   └── graph.py     # LangGraph compilation
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── crud.py
│   │   ├── router.py
│   │   └── main.py
│   ├── .env
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── store/           # Redux state store
    │   ├── components/      # Reusable components
    │   │   ├── ToggleTabs.jsx
    │   │   ├── ManualForm.jsx
    │   │   ├── ChatInterface.jsx
    │   │   ├── AIInsightsPanel.jsx
    │   │   └── Toast.jsx
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── tailwind.config.js
    ├── index.html
    └── .env
```

---

## 5 LangGraph Tools Specification

The LangGraph agent coordinates sales-representative actions. The router node inspects user messages and forwards requests to one of these 5 specific tools:

### 1. Log Interaction (`log_interaction_tool`)
* **Trigger Condition**: When the representative types a meeting transcript/notes in the AI Chat window.
* **Input Expected**: Raw natural language transcript text.
* **Returns**: A JSON structure containing:
  * `extracted_data`: The 15 form-ready fields (Doctor Name, Hospital Name, Product, etc.).
  * `ai_insights`: Computed items (Sentiment, Priority, Risk Level, Confidence, and Summary).
* **Routing Placement**: The entry point routes to the `extractor` node which executes this tool. It then automatically runs the Generate Summary and Recommend Next Action tools in sequence.

### 2. Edit Interaction (`edit_interaction_tool`)
* **Trigger Condition**: When the rep types a command to update details (e.g. "Change the follow-up date to next month").
* **Input Expected**: `interaction_id` (integer) and `instruction` (string).
* **Returns**: Updated database record in JSON format.
* **Routing Placement**: The router maps keywords like "change", "edit", or "update" to the `editor` node, which invokes this tool and updates the DB.

### 3. Search Doctor History (`search_doctor_history_tool`)
* **Trigger Condition**: When the rep asks about a doctor's history (e.g. "Show previous meetings with Dr. Sharma").
* **Input Expected**: `doctor_name` (string).
* **Returns**: A list of summarized past interactions with this doctor.
* **Routing Placement**: The router maps keywords like "history" or "past" to the `history` node, which queries the database and formats results.

### 4. Generate Meeting Summary (`generate_meeting_summary_tool`)
* **Trigger Condition**: Automatically executed during chat extraction, or manually triggered by the representative clicking "AI Insights".
* **Input Expected**: A dictionary containing the structured form fields.
* **Returns**: A professional, third-person paragraph summary suitable for internal reporting.
* **Routing Placement**: Executed within the `extractor` node or explicitly via the `/summary` router endpoint.

### 5. Recommend Next Action (`recommend_next_action_tool`)
* **Trigger Condition**: Executed post-extraction to provide immediate next steps in the AI Insights sidebar.
* **Input Expected**: Structured interaction form fields dictionary.
* **Returns**: Bulleted list recommendations.
* **Routing Placement**: Called inside `extractor` / `editor` nodes, or via the `/recommendation` endpoint.

---

## Installation & Setup Guide

### Prerequisites
* Python 3.10+
* Node.js v18+ & npm
* Groq API Key

---

### Step 1: Backend Setup
1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` folder and enter your credentials:
   ```env
   GROQ_API_KEY=gsk_your_groq_api_key_here
   DATABASE_URL=sqlite:///./mediket.db
   ```
   *(Note: SQLite is configured by default. If you prefer PostgreSQL, set your `DATABASE_URL` connection string here).*
5. Start the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend documentation will be accessible at: [http://localhost:8000/docs](http://localhost:8000/docs). The database is automatically created and seeded with test records on startup.

---

### Step 2: Frontend Setup
1. Open a new terminal and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Ensure the `.env` file has the correct backend URL:
   ```env
   VITE_API_URL=http://localhost:8000
   ```
4. Run the Vite development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to the address displayed in the console (usually [http://localhost:5173](http://localhost:5173)).

---

## Guide for 10-15 Min Video Demo

When recording your submission, follow this walkthrough script to demonstrate all features:

1. **Introduction & Architecture (2 mins)**:
   * Introduce yourself, the Mediket CRM application, and explain the directory layout.
   * Highlight how the database is seeded automatically (adds doctors, products, and one past interaction for Dr. Sharma).

2. **Option 1: Structured Form Demo (3 mins)**:
   * Keep the toggle at **Fill Form**.
   * Enter a doctor's name (e.g., "Dr. Smith"), hospital ("General Hospital"), product ("DiabeStop"), and a meeting date.
   * Click **AI Insights**. Point out how the "AI Insights" panel immediately generates a summary, determines sentiment/priority, recommends compliance next steps, and queries history.
   * Fill out any remaining details and click **Save Log**. Show the success toast.

3. **Option 2: Chat Interface Logging Demo (4 mins)**:
   * Toggle to **Chat with AI**.
   * Copy/paste or type a natural language transcript, e.g.:
     > *"Today I met Dr Sharma at Apollo Hospital. We discussed CardioPlus. Doctor was interested, requested clinical trial reports. Schedule follow-up after two weeks."*
   * Click send. Highlight the "thinking" indicator.
   * Once returned, show how the form on the right **auto-populated** the fields (Dr. Sharma, Apollo Hospital, CardioPlus, etc.).
   * Point out the **Staged AI Insights** card above the form showing Sentiment (Positive), Priority (High), and Risk Level (Low).

4. **Edit Interaction Tool Demo (2 mins)**:
   * Since you just logged a staged interaction, type a correction in the chat:
     > *"Change interest level to High and update follow-up date to 2026-08-01."*
   * Send it. Show how the form fields on the right update in real-time.
   * Click **Save Log** to persist this to the DB.

5. **Search Doctor History Tool Demo (2 mins)**:
   * In the chat, type:
     > *"Show previous interactions with Dr. Sharma"*
   * Show how the AI calls the history tool, searches the DB, and shows the past history list inside the Chat logs and refreshes the panel.
