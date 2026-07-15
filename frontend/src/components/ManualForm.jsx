import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setFormData, clearForm, showToast, setStatus, setAiInsights, setDoctorHistory, setCurrentInteractionId } from '../store/interactionSlice';
import axios from 'axios';
import { User, Building2, Calendar, Clock, Award, AlertCircle, Sparkles, Trash2, Save } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ManualForm() {
  const formData = useSelector((state) => state.interaction.formData);
  const status = useSelector((state) => state.interaction.status);
  const currentInteractionId = useSelector((state) => state.interaction.currentInteractionId);
  const dispatch = useDispatch();

  const [validationErrors, setValidationErrors] = useState({});

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
        // Update the existing interaction (not a new one) — pass id so backend updates in place
        response = await axios.post(`${API_URL}/interaction/save`, {
          id: currentInteractionId,
          extracted_data: formData,
          ai_insights: {
            Sentiment: "Neutral", // Default placeholder if not computed by AI
            Priority: formData["Follow-up Date"] ? "High" : "Medium",
            "Risk Level": "Low",
            "Confidence Score": 1.0,
            "Meeting Summary": "Manually logged/edited interaction"
          }
        });
      } else {
        // New manual interaction
        response = await axios.post(`${API_URL}/interaction/manual`, formData);
      }

      dispatch(showToast({ type: 'success', message: 'Interaction saved successfully!' }));
      dispatch(setCurrentInteractionId(response.data.id));
      
      // Auto fetch the doctor's history to update insights panel
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
      
      // Seed mock values for indicators
      dispatch(setAiInsights({
        Sentiment: (formData["Meeting Notes"] || "").toLowerCase().includes("interested") ? "Positive" : "Neutral",
        Priority: formData["Follow-up Date"] ? "High" : "Medium",
        "Risk Level": "Low",
        "Confidence Score": 0.95,
        "Meeting Summary": sumRes.data.summary,
        "Next Action Recommendation": recRes.data.recommendation
      }));

      // Fetch doctor history
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

  const str = (val) => String(val);

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* SECTION 1: Doctor & Hospital Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <User className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Doctor & Hospital Info</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Doctor Name *</label>
              <input
                type="text"
                value={formData["Doctor Name"] || ""}
                onChange={(e) => handleInputChange("Doctor Name", e.target.value)}
                placeholder="e.g. Dr. Sharma"
                className={`w-full bg-slate-950/60 border rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                  validationErrors["Doctor Name"] ? 'border-rose-500/50 focus:ring-rose-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
              {validationErrors["Doctor Name"] && (
                <p className="text-rose-400 text-xxs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {validationErrors["Doctor Name"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Hospital Name *</label>
              <input
                type="text"
                value={formData["Hospital Name"] || ""}
                onChange={(e) => handleInputChange("Hospital Name", e.target.value)}
                placeholder="e.g. Apollo Hospital"
                className={`w-full bg-slate-950/60 border rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                  validationErrors["Hospital Name"] ? 'border-rose-500/50 focus:ring-rose-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
              {validationErrors["Hospital Name"] && (
                <p className="text-rose-400 text-xxs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {validationErrors["Hospital Name"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Specialization</label>
              <input
                type="text"
                value={formData["Specialization"] || ""}
                onChange={(e) => handleInputChange("Specialization", e.target.value)}
                placeholder="e.g. Cardiology"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Department</label>
              <input
                type="text"
                value={formData["Department"] || ""}
                onChange={(e) => handleInputChange("Department", e.target.value)}
                placeholder="e.g. Cardiology Dept"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Meeting Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Building2 className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Meeting Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Product Discussed *</label>
              <input
                type="text"
                value={formData["Product Discussed"] || ""}
                onChange={(e) => handleInputChange("Product Discussed", e.target.value)}
                placeholder="e.g. CardioPlus"
                className={`w-full bg-slate-950/60 border rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                  validationErrors["Product Discussed"] ? 'border-rose-500/50 focus:ring-rose-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
              {validationErrors["Product Discussed"] && (
                <p className="text-rose-400 text-xxs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {validationErrors["Product Discussed"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Meeting Date *</label>
              <input
                type="date"
                value={formData["Meeting Date"] || ""}
                onChange={(e) => handleInputChange("Meeting Date", e.target.value)}
                className={`w-full bg-slate-950/60 border rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                  validationErrors["Meeting Date"] ? 'border-rose-500/50 focus:ring-rose-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              />
              {validationErrors["Meeting Date"] && (
                <p className="text-rose-400 text-xxs mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {validationErrors["Meeting Date"]}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Meeting Time</label>
              <input
                type="text"
                value={formData["Meeting Time"] || ""}
                onChange={(e) => handleInputChange("Meeting Time", e.target.value)}
                placeholder="e.g. 10:30 AM"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Interest Level</label>
              <select
                value={formData["Interest Level"] || "Medium"}
                onChange={(e) => handleInputChange("Interest Level", e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
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
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Award className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Notes & Requests</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Doctor Requests (free text)</label>
              <textarea
                value={formData["Doctor Requests"] || ""}
                onChange={(e) => handleInputChange("Doctor Requests", e.target.value)}
                rows={2}
                placeholder="e.g. Asked for 3 packages of samples, requested CardioPlus safety dossier."
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Competitor Mentioned (optional)</label>
              <input
                type="text"
                value={formData["Competitor Mentioned"] || ""}
                onChange={(e) => handleInputChange("Competitor Mentioned", e.target.value)}
                placeholder="e.g. CardioMax"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Meeting Notes</label>
              <textarea
                value={formData["Meeting Notes"] || ""}
                onChange={(e) => handleInputChange("Meeting Notes", e.target.value)}
                rows={3}
                placeholder="Write summary notes of the interaction..."
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Action Items</label>
              <textarea
                value={formData["Action Items"] || ""}
                onChange={(e) => handleInputChange("Action Items", e.target.value)}
                rows={2}
                placeholder="e.g. Send clinical trial reports by Thursday."
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Follow-up & Identity */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Calendar className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Follow-up & Representative</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Follow-up Date</label>
              <input
                type="date"
                value={formData["Follow-up Date"] || ""}
                onChange={(e) => handleInputChange("Follow-up Date", e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Representative Name</label>
              <input
                type="text"
                value={formData["Representative Name"] || ""}
                onChange={(e) => handleInputChange("Representative Name", e.target.value)}
                placeholder="e.g. Alex Green"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 mt-4">
            <label className="block text-xs font-medium text-slate-400 mb-1">Additional Comments (always visible, always optional)</label>
            <textarea
              value={formData["Additional Comments"] || ""}
              onChange={(e) => handleInputChange("Additional Comments", e.target.value)}
              rows={2}
              placeholder="Any supplementary comments not fitting in other fields..."
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-850">
          <button
            type="button"
            onClick={() => dispatch(clearForm())}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-all uppercase tracking-wider"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleEnrich}
              disabled={status === 'loading'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 text-xs font-semibold transition-all uppercase tracking-wider disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              AI Insights
            </button>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all uppercase tracking-wider disabled:opacity-50"
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
