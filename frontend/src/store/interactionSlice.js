import { createSlice } from '@reduxjs/toolkit';

const initialFormState = {
  "Doctor Name": "",
  "Hospital Name": "",
  "Specialization": "",
  "Department": "",
  "Product Discussed": "",
  "Meeting Date": new Date().toISOString().split('T')[0], // Default to today
  "Meeting Time": "",
  "Interest Level": "Medium",
  "Meeting Notes": "",
  "Action Items": "",
  "Follow-up Date": "",
  "Doctor Requests": "",
  "Competitor Mentioned": "",
  "Additional Comments": "",
  "Representative Name": "",
};

const initialInsightsState = {
  "Sentiment": null,
  "Priority": null,
  "Risk Level": null,
  "Confidence Score": null,
  "Meeting Summary": "",
  "Next Action Recommendation": "",
};

const interactionSlice = createSlice({
  name: 'interaction',
  initialState: {
    activeTab: 'form', // 'form' | 'chat'
    formData: { ...initialFormState },
    aiInsights: { ...initialInsightsState },
    doctorHistory: [],
    chatMessages: [
      {
        id: 'welcome',
        sender: 'ai',
        text: "Hello! I am your AI CRM Assistant. You can describe your meeting in natural language (e.g., 'Met Dr Sharma at Apollo Hospital today about CardioPlus. Interest was high, requested trial papers. Follow up in two weeks.') and I will extract all the structured details for you."
      }
    ],
    status: 'idle', // 'idle' | 'loading' | 'success' | 'error'
    error: null,
    toast: null, // { type: 'success' | 'error', message: '...' }
    currentInteractionId: null,
  },
  reducers: {
    setFormData: (state, action) => {
      const { field, value } = action.payload;
      state.formData[field] = value;
    },
    updateAllFormData: (state, action) => {
      state.formData = { ...state.formData, ...action.payload };
    },
    setAiInsights: (state, action) => {
      state.aiInsights = { ...state.aiInsights, ...action.payload };
    },
    setDoctorHistory: (state, action) => {
      state.doctorHistory = action.payload;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    addChatMessage: (state, action) => {
      state.chatMessages.push({
        id: Date.now().toString(),
        ...action.payload
      });
    },
    clearForm: (state) => {
      state.formData = { ...initialFormState };
      state.aiInsights = { ...initialInsightsState };
      state.currentInteractionId = null;
      state.doctorHistory = [];
    },
    showToast: (state, action) => {
      state.toast = action.payload;
    },
    hideToast: (state) => {
      state.toast = null;
    },
    setStatus: (state, action) => {
      state.status = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setCurrentInteractionId: (state, action) => {
      state.currentInteractionId = action.payload;
    }
  }
});

export const {
  setFormData,
  updateAllFormData,
  setAiInsights,
  setDoctorHistory,
  setActiveTab,
  addChatMessage,
  clearForm,
  showToast,
  hideToast,
  setStatus,
  setError,
  setCurrentInteractionId
} = interactionSlice.actions;

export default interactionSlice.reducer;
