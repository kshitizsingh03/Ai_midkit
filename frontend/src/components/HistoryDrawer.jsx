import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { updateAllFormData, setAiInsights, setCurrentInteractionId, showToast } from '../store/interactionSlice';
import axios from 'axios';
import { X, Search, Calendar, User, FileText, ChevronDown, Edit2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function HistoryDrawer({ isOpen, onClose }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/interactions`);
      setRecords(res.data);
    } catch (err) {
      console.error(err);
      dispatch(showToast({ type: 'error', message: 'Failed to fetch history.' }));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rec) => {
    const formFields = {
      "Doctor Name": rec.doctor_name,
      "Hospital Name": rec.hospital_name,
      "Specialization": rec.specialization,
      "Department": rec.department,
      "Product Discussed": rec.product_discussed,
      "Meeting Date": rec.meeting_date,
      "Meeting Time": rec.meeting_time,
      "Interest Level": rec.interest_level || "Medium",
      "Meeting Notes": rec.meeting_notes,
      "Action Items": rec.action_items,
      "Follow-up Date": rec.follow_up_date,
      "Doctor Requests": rec.doctor_requests,
      "Competitor Mentioned": rec.competitor_mentioned,
      "Additional Comments": rec.additional_comments,
      "Representative Name": rec.representative_name,
    };
    const insights = {
      "Sentiment": rec.sentiment || "Neutral",
      "Priority": rec.priority || "Medium",
      "Risk Level": rec.risk_level || "Low",
      "Confidence Score": rec.confidence_score || 1.0,
      "Meeting Summary": rec.meeting_summary,
      "Next Action Recommendation": rec.meeting_summary ? "Check compliance next actions." : ""
    };

    dispatch(updateAllFormData(formFields));
    dispatch(setAiInsights(insights));
    dispatch(setCurrentInteractionId(rec.id));
    dispatch(showToast({ type: 'success', message: `Loaded ${rec.doctor_name}'s record for editing!` }));
    onClose();
  };

  const filteredRecords = records.filter(rec => 
    (rec.doctor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rec.hospital_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rec.product_discussed || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSentimentEmoji = (sentiment) => {
    if (!sentiment) return '😐';
    const s = sentiment.toLowerCase();
    if (s.includes('positive')) return '😃';
    if (s.includes('negative')) return '😟';
    return '😐';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col h-full">
          
          {/* Header */}
          <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">Saved Interactions History</h2>
              <p className="text-[10px] text-slate-500">View and edit all previously logged records.</p>
            </div>
            <button 
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by doctor, hospital, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Records List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/20">
            {loading ? (
              <div className="text-center py-12 text-xs text-slate-400">Loading history records...</div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-450 italic">No records found.</div>
            ) : (
              filteredRecords.map((rec) => {
                const isExpanded = expandedId === rec.id;
                return (
                  <div 
                    key={rec.id} 
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-350 transition-all shadow-xs"
                  >
                    {/* Compact Card Header */}
                    <div 
                      onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                      className="p-4 cursor-pointer flex items-center justify-between hover:bg-slate-50/30 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-850">{rec.doctor_name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                            {rec.product_discussed}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {rec.meeting_date}</span>
                          <span>{rec.hospital_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getSentimentEmoji(rec.sentiment)}</span>
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Detailed Card Body */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/10 space-y-3 text-[11px] text-slate-700">
                        {rec.meeting_summary && (
                          <div>
                            <span className="font-bold text-slate-450 uppercase tracking-wider text-[9px] block mb-0.5">Summary</span>
                            <p className="bg-white border border-slate-200 p-2.5 rounded-xl text-slate-700 leading-relaxed shadow-inner">{rec.meeting_summary}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <div>
                            <span className="font-bold text-slate-450 uppercase tracking-wider text-[9px] block">Hospital</span>
                            <span className="text-slate-800 font-medium">{rec.hospital_name}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-450 uppercase tracking-wider text-[9px] block">Specialization</span>
                            <span className="text-slate-800 font-medium">{rec.specialization || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-450 uppercase tracking-wider text-[9px] block">Department</span>
                            <span className="text-slate-800 font-medium">{rec.department || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-450 uppercase tracking-wider text-[9px] block">Time</span>
                            <span className="text-slate-800 font-medium">{rec.meeting_time || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-450 uppercase tracking-wider text-[9px] block">Sentiment</span>
                            <span className="text-slate-800 font-medium">{rec.sentiment || 'Neutral'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-slate-450 uppercase tracking-wider text-[9px] block">Priority</span>
                            <span className="text-slate-800 font-medium">{rec.priority || 'Medium'}</span>
                          </div>
                        </div>

                        {rec.meeting_notes && (
                          <div>
                            <span className="font-bold text-slate-450 uppercase tracking-wider text-[9px] block mb-0.5">Meeting Notes</span>
                            <p className="bg-white border border-slate-200 p-2.5 rounded-xl text-slate-700 leading-relaxed whitespace-pre-line shadow-inner">{rec.meeting_notes}</p>
                          </div>
                        )}

                        {rec.action_items && (
                          <div>
                            <span className="font-bold text-slate-450 uppercase tracking-wider text-[9px] block mb-0.5">Action Items</span>
                            <p className="bg-white border border-slate-200 p-2.5 rounded-xl text-slate-700 leading-relaxed shadow-inner">{rec.action_items}</p>
                          </div>
                        )}

                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleEdit(rec)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] shadow-sm transition-all"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Load into Form
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
