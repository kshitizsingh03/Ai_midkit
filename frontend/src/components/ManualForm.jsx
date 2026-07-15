import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setFormData, clearForm, showToast, setStatus, setAiInsights, setDoctorHistory, setCurrentInteractionId, updateAllFormData } from '../store/interactionSlice';
import axios from 'axios';
import { User, Building2, Calendar, Clock, Award, AlertCircle, Sparkles, Trash2, Save, Mic, MicOff } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ManualForm() {
  const formData = useSelector((state) => state.interaction.formData);
  const status = useSelector((state) => state.interaction.status);
  const currentInteractionId = useSelector((state) => state.interaction.currentInteractionId);
  const aiInsights = useSelector((state) => state.interaction.aiInsights);
  const dispatch = useDispatch();

  const [validationErrors, setValidationErrors] = useState({});
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const handleInputChange = (field, value) => {
    dispatch(setFormData({ field, value }));
    // Clear validation error on change
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const getInputClass = (field) => {
    const value = formData[field];
    const hasValue = value !== undefined && value !== null && (typeof value === 'string' ? value.trim() !== '' : true);
    const base = "w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all duration-300 ";
    if (validationErrors[field]) {
      return base + "border-rose-300 bg-rose-50/30 text-rose-900 focus:border-rose-500 focus:ring-rose-500/10 placeholder-rose-300";
    }
    if (hasValue) {
      return base + "border-indigo-200 bg-indigo-50/10 focus:border-indigo-500 focus:ring-indigo-500/10 text-slate-800 placeholder-slate-400 shadow-sm";
    }
    return base + "border-slate-200 bg-slate-50/40 focus:border-indigo-500 focus:ring-indigo-500/10 text-slate-800 placeholder-slate-400";
  };

  const SpeechRecognitionAPI = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

  const handleVoiceNote = () => {
    if (!SpeechRecognitionAPI) {
      dispatch(showToast({ type: 'error', message: 'Voice input is not supported in this browser. Try Chrome or Edge.' }));
      return;
    }
    
    if (isRecordingVoice) {
      setIsRecordingVoice(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecordingVoice(true);
      dispatch(showToast({ type: 'success', message: 'Listening... Speak now!' }));
    };

    recognition.onerror = (e) => {
      console.error(e);
      setIsRecordingVoice(false);
      dispatch(showToast({ type: 'error', message: 'Could not access microphone.' }));
    };

    recognition.onend = () => {
      setIsRecordingVoice(false);
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      if (!transcript.trim()) return;

      dispatch(setStatus('loading'));
      dispatch(showToast({ type: 'success', message: 'AI is extracting details from voice note...' }));
      
      try {
        const response = await axios.post(`${API_URL}/interaction/chat`, {
          text: transcript,
          current_data: formData,
          ai_insights: aiInsights
        });

        const { extracted_data, ai_insights, message, doctor_history } = response.data;

        if (extracted_data) {
          dispatch(updateAllFormData(extracted_data));
        }
        if (ai_insights) {
          dispatch(setAiInsights(ai_insights));
        }
        if (doctor_history) {
          dispatch(setDoctorHistory(doctor_history));
        }
        if (response.data.id) {
          dispatch(setCurrentInteractionId(response.data.id));
        }

        dispatch(showToast({ type: 'success', message: 'Form populated from voice note!' }));
        dispatch(setStatus('success'));
      } catch (error) {
        console.error(error);
        const errMsg = error.response?.data?.detail || 'Failed to extract from voice note.';
        dispatch(showToast({ type: 'error', message: errMsg }));
        dispatch(setStatus('error'));
      }
    };

    recognition.start();
  };

  const validateForm = () => {
    const errors = {};
    if (!formData["Doctor Name"]?.trim()) errors["Doctor Name"] = "Doctor Name is required";
    if (!formData["Hospital Name"]?.trim()) errors["Hospital Name"] = "Hospital Name is required";
    if (!formData["Product Discussed"]?.trim()) errors["Product Discussed"] = "Product Discussed is required";
    if (!formData["Meeting Date"]) errors["Meeting Date"] = "Meeting Date is required";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      dispatch(showToast({ type: 'error', message: 'Please fill in all required fields.' }));
      return;
    }

    dispatch(setStatus('loading'));
    try {
      let response;
      if (currentInteractionId) {
        response = await axios.post(`${API_URL}/interaction/save`, {
          id: currentInteractionId,
          extracted_data: formData,
          ai_insights: aiInsights || {
            Sentiment: "Neutral",
            Priority: formData["Follow-up Date"] ? "High" : "Medium",
            "Risk Level": "Low",
            "Confidence Score": 1.0,
            "Meeting Summary": "Manually logged/edited interaction"
          }
        });
      } else {
        response = await axios.post(`${API_URL}/interaction/manual`, formData);
      }

      dispatch(showToast({ type: 'success', message: 'Interaction saved successfully!' }));
      dispatch(setCurrentInteractionId(response.data.id));
      
      try {
        const historyRes = await axios.get(`${API_URL}/doctor/history`, {
          params: { doctor_name: formData["Doctor Name"] }
        });
        dispatch(setDoctorHistory(historyRes.data));
      } catch (err) {
        console.error("Failed to refresh history:", err);
      }
      
      dispatch(setStatus('success'));
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.detail || 'Failed to save interaction. Please check the backend.';
      dispatch(showToast({ type: 'error', message: errMsg }));
      dispatch(setStatus('error'));
    }
  };

  const handleEnrich = async () => {
    if (!validateForm()) {
      dispatch(showToast({ type: 'error', message: 'Fill in required fields before AI analysis.' }));
      return;
    }
    dispatch(setStatus('loading'));
    dispatch(showToast({ type: 'success', message: 'AI is analyzing form details...' }));
    try {
      const summaryPromise = axios.post(`${API_URL}/summary`, formData);
      const recPromise = axios.post(`${API_URL}/recommendation`, formData);
      
      const [sumRes, recRes] = await Promise.all([summaryPromise, recPromise]);
      
      dispatch(setAiInsights({
        Sentiment: (formData["Meeting Notes"] || "").toLowerCase().includes("interested") ? "Positive" : "Neutral",
        Priority: formData["Follow-up Date"] ? "High" : "Medium",
        "Risk Level": "Low",
        "Confidence Score": 0.95,
        "Meeting Summary": sumRes.data.summary,
        "Next Action Recommendation": recRes.data.recommendation
      }));

      const historyRes = await axios.get(`${API_URL}/doctor/history`, {
        params: { doctor_name: formData["Doctor Name"] }
      });
      dispatch(setDoctorHistory(historyRes.data));

      dispatch(showToast({ type: 'success', message: 'AI insights generated!' }));
      dispatch(setStatus('idle'));
    } catch (error) {
      console.error(error);
      dispatch(showToast({ type: 'error', message: 'Failed to generate AI insights.' }));
      dispatch(setStatus('error'));
    }
  };

  return (
    <div className="space-y-6 bg-transparent">
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* SECTION 1: Doctor & Hospital Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <User className="h-5 w-5 text-indigo-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Doctor & Hospital Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Doctor Name *</label>
              <input
                type="text"
                value={formData["Doctor Name"] || ""}
                onChange={(e) => handleInputChange("Doctor Name", e.target.value)}
                placeholder="e.g. Dr. Sharma"
                className={getInputClass("Doctor Name")}
              />
              {validationErrors["Doctor Name"] && (
                <p className="text-rose-600 text-xxs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {validationErrors["Doctor Name"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Hospital Name *</label>
              <input
                type="text"
                value={formData["Hospital Name"] || ""}
                onChange={(e) => handleInputChange("Hospital Name", e.target.value)}
                placeholder="e.g. Apollo Hospital"
                className={getInputClass("Hospital Name")}
              />
              {validationErrors["Hospital Name"] && (
                <p className="text-rose-600 text-xxs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {validationErrors["Hospital Name"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Specialization</label>
              <input
                type="text"
                value={formData["Specialization"] || ""}
                onChange={(e) => handleInputChange("Specialization", e.target.value)}
                placeholder="e.g. Cardiology"
                className={getInputClass("Specialization")}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Department</label>
              <input
                type="text"
                value={formData["Department"] || ""}
                onChange={(e) => handleInputChange("Department", e.target.value)}
                placeholder="e.g. Cardiology Dept"
                className={getInputClass("Department")}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Meeting Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Building2 className="h-5 w-5 text-indigo-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Meeting Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Product Discussed *</label>
              <input
                type="text"
                value={formData["Product Discussed"] || ""}
                onChange={(e) => handleInputChange("Product Discussed", e.target.value)}
                placeholder="e.g. CardioPlus"
                className={getInputClass("Product Discussed")}
              />
              {validationErrors["Product Discussed"] && (
                <p className="text-rose-600 text-xxs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {validationErrors["Product Discussed"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Meeting Date *</label>
              <input
                type="date"
                value={formData["Meeting Date"] || ""}
                onChange={(e) => handleInputChange("Meeting Date", e.target.value)}
                className={getInputClass("Meeting Date")}
              />
              {validationErrors["Meeting Date"] && (
                <p className="text-rose-600 text-xxs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {validationErrors["Meeting Date"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Meeting Time</label>
              <input
                type="text"
                value={formData["Meeting Time"] || ""}
                onChange={(e) => handleInputChange("Meeting Time", e.target.value)}
                placeholder="e.g. 10:30 AM"
                className={getInputClass("Meeting Time")}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Interest Level</label>
              <select
                value={formData["Interest Level"] || "Medium"}
                onChange={(e) => handleInputChange("Interest Level", e.target.value)}
                className={getInputClass("Interest Level") + " bg-slate-50 text-slate-800 cursor-pointer"}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: Content & Notes */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Award className="h-5 w-5 text-indigo-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Notes, Requests & Sentiment</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Doctor Requests (free text)</label>
              <textarea
                value={formData["Doctor Requests"] || ""}
                onChange={(e) => handleInputChange("Doctor Requests", e.target.value)}
                rows={2}
                placeholder="e.g. Asked for 3 packages of samples, requested CardioPlus safety dossier."
                className={getInputClass("Doctor Requests") + " resize-none"}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Competitor Mentioned (optional)</label>
              <input
                type="text"
                value={formData["Competitor Mentioned"] || ""}
                onChange={(e) => handleInputChange("Competitor Mentioned", e.target.value)}
                placeholder="e.g. CardioMax"
                className={getInputClass("Competitor Mentioned")}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Topics Discussed / Meeting Notes</label>
              <textarea
                value={formData["Meeting Notes"] || ""}
                onChange={(e) => handleInputChange("Meeting Notes", e.target.value)}
                rows={3}
                placeholder="Write summary notes of the interaction..."
                className={getInputClass("Meeting Notes") + " resize-none"}
              />
              
              {/* Voice Note Consent Button */}
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={handleVoiceNote}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold transition-all duration-300 ${
                    isRecordingVoice 
                      ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse shadow-sm shadow-rose-100'
                      : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700'
                  }`}
                >
                  <Mic className={`h-4 w-4 ${isRecordingVoice ? 'animate-bounce' : ''}`} />
                  {isRecordingVoice ? 'Recording voice note... Click to stop & extract' : 'Summarize from Voice Note (Requires Consent)'}
                </button>
              </div>
            </div>

            {/* Observed/Inferred HCP Sentiment */}
            <div className="space-y-2 mt-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Observed/Inferred HCP Sentiment</label>
              <div className="flex gap-4 items-center">
                {[
                  { value: 'Positive', emoji: '😃', label: 'Positive' },
                  { value: 'Neutral', emoji: '😐', label: 'Neutral' },
                  { value: 'Negative', emoji: '😟', label: 'Negative' }
                ].map((opt) => {
                  const isChecked = aiInsights.Sentiment?.toLowerCase().includes(opt.value.toLowerCase()) || false;
                  
                  let activeStyles = 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold shadow-sm';
                  if (isChecked) {
                    if (opt.value === 'Positive') activeStyles = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold shadow-sm';
                    if (opt.value === 'Neutral') activeStyles = 'bg-amber-50 border-amber-300 text-amber-800 font-semibold shadow-sm';
                    if (opt.value === 'Negative') activeStyles = 'bg-rose-50 border-rose-300 text-rose-800 font-semibold shadow-sm';
                  }
                  
                  return (
                    <label key={opt.value} className={`flex items-center gap-2 cursor-pointer px-4.5 py-2.5 rounded-xl border transition-all duration-300 select-none ${
                      isChecked 
                        ? activeStyles 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}>
                      <input
                        type="radio"
                        name="sentiment"
                        value={opt.value}
                        checked={isChecked}
                        onChange={() => dispatch(setAiInsights({ ...aiInsights, Sentiment: opt.value }))}
                        className="hidden"
                      />
                      <span className="text-base">{opt.emoji}</span>
                      <span className="text-xs">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Action Items</label>
              <textarea
                value={formData["Action Items"] || ""}
                onChange={(e) => handleInputChange("Action Items", e.target.value)}
                rows={2}
                placeholder="e.g. Send clinical trial reports by Thursday."
                className={getInputClass("Action Items") + " resize-none"}
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Follow-up & Identity */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Follow-up & Representative</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Follow-up Date</label>
              <input
                type="date"
                value={formData["Follow-up Date"] || ""}
                onChange={(e) => handleInputChange("Follow-up Date", e.target.value)}
                className={getInputClass("Follow-up Date")}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Representative Name</label>
              <input
                type="text"
                value={formData["Representative Name"] || ""}
                onChange={(e) => handleInputChange("Representative Name", e.target.value)}
                placeholder="e.g. Alex Green"
                className={getInputClass("Representative Name")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 mt-4">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Additional Comments</label>
            <textarea
              value={formData["Additional Comments"] || ""}
              onChange={(e) => handleInputChange("Additional Comments", e.target.value)}
              rows={2}
              placeholder="Any supplementary comments not fitting in other fields..."
              className={getInputClass("Additional Comments") + " resize-none"}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={() => dispatch(clearForm())}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all uppercase tracking-wider bg-white shadow-sm"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleEnrich}
              disabled={status === 'loading'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-semibold transition-all uppercase tracking-wider disabled:opacity-50 bg-white shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              AI Insights
            </button>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all uppercase tracking-wider disabled:opacity-50 shadow-sm shadow-indigo-200"
            >
              <Save className="h-4 w-4" />
              {status === 'loading' ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
