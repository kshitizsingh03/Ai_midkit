import React from 'react';
import { useSelector } from 'react-redux';
import { Sparkles, BarChart2, ShieldAlert, Award, FileText, Activity } from 'lucide-react';

export default function AIInsightsPanel() {
  const aiInsights = useSelector((state) => state.interaction.aiInsights);
  const doctorHistory = useSelector((state) => state.interaction.doctorHistory);
  const formData = useSelector((state) => state.interaction.formData);

  const getSentimentColor = (sentiment) => {
    if (!sentiment) return 'bg-slate-50 text-slate-400 border-slate-200';
    const s = sentiment.toLowerCase();
    if (s.includes('positive')) return 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm';
    if (s.includes('negative')) return 'bg-rose-50 text-rose-800 border-rose-200 shadow-sm';
    return 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm';
  };

  const getPriorityColor = (priority) => {
    if (!priority) return 'bg-slate-50 text-slate-400 border-slate-200';
    const p = priority.toLowerCase();
    if (p.includes('urgent')) return 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse shadow-sm';
    if (p.includes('high')) return 'bg-orange-50 text-orange-800 border-orange-200 shadow-sm';
    if (p.includes('medium')) return 'bg-indigo-50 text-indigo-800 border-indigo-200 shadow-sm';
    return 'bg-slate-50 text-slate-400 border-slate-200';
  };

  const getRiskColor = (risk) => {
    if (!risk) return 'bg-slate-50 text-slate-400 border-slate-200';
    const r = risk.toLowerCase();
    if (r.includes('high')) return 'bg-rose-50 text-rose-800 border-rose-200 shadow-sm';
    if (r.includes('medium')) return 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm';
    return 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm';
  };

  const confidencePct = aiInsights["Confidence Score"] 
    ? Math.round(aiInsights["Confidence Score"] * 100) 
    : null;

  return (
    <div className="space-y-6">
      
      {/* 1. AI Insights Metrics Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-800">AI Judgments & Insights</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Sentiment */}
          <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <Activity className="h-3 w-3 text-indigo-500" /> Sentiment
            </span>
            <div className={`text-center py-1.5 rounded-xl text-xs font-bold border ${getSentimentColor(aiInsights["Sentiment"])}`}>
              {aiInsights["Sentiment"] || 'Pending...'}
            </div>
          </div>

          {/* Priority */}
          <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3 text-indigo-500" /> Priority
            </span>
            <div className={`text-center py-1.5 rounded-xl text-xs font-bold border ${getPriorityColor(aiInsights["Priority"])}`}>
              {aiInsights["Priority"] || 'Pending...'}
            </div>
          </div>

          {/* Risk Level */}
          <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3 text-indigo-500" /> Risk Level
            </span>
            <div className={`text-center py-1.5 rounded-xl text-xs font-bold border ${getRiskColor(aiInsights["Risk Level"])}`}>
              {aiInsights["Risk Level"] || 'Pending...'}
            </div>
          </div>

          {/* Confidence Score */}
          <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              <Award className="h-3 w-3 text-indigo-500" /> Confidence
            </span>
            <div className="text-center py-1.5 rounded-xl text-xs font-bold border border-indigo-100 bg-indigo-50/30 text-indigo-750">
              {confidencePct ? `${confidencePct}%` : 'Pending...'}
            </div>
          </div>
        </div>

        {/* Meeting Summary */}
        <div className="space-y-1.5 mb-4">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-indigo-500" /> Meeting Summary
          </span>
          <div className="p-3 bg-slate-50/40 border border-slate-200 rounded-2xl text-xs text-slate-600 leading-relaxed min-h-[60px]">
            {aiInsights["Meeting Summary"] || 'Save the interaction or use Chat with AI to automatically generate a summary.'}
          </div>
        </div>

        {/* Next Best Action Recommendations */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <BarChart2 className="h-3.5 w-3.5 text-indigo-500" /> Recommended Next Steps
          </span>
          <div className="p-4 bg-indigo-50/20 border border-indigo-100 rounded-2xl text-xs text-indigo-900 leading-relaxed min-h-[80px]">
            {aiInsights["Next Action Recommendation"] ? (
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                {aiInsights["Next Action Recommendation"].split('\n').map((line, idx) => {
                  const cleaned = line.replace(/^[-\s*]+/, '').trim();
                  if (!cleaned) return null;
                  return <li key={idx}>{cleaned}</li>;
                })}
              </ul>
            ) : (
              <span className="text-slate-400 italic">Provide details or run AI extraction to see suggestions.</span>
            )}
          </div>
        </div>

      </div>

      {/* 2. Doctor History Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-800">Doctor History</h3>
          </div>
          {formData["Doctor Name"] && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">
              {formData["Doctor Name"]}
            </span>
          )}
        </div>

        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
          {doctorHistory.length > 0 ? (
            doctorHistory.map((item) => (
              <div key={item.id} className="p-3 bg-slate-50/50 border border-slate-200 rounded-2xl hover:border-indigo-200 transition-all flex flex-col gap-1 text-[11px] shadow-sm">
                <div className="flex justify-between items-center text-slate-500 font-semibold mb-1">
                  <span className="text-indigo-600 font-bold">{item.product_discussed}</span>
                  <span>{item.meeting_date}</span>
                </div>
                <div className="text-slate-600 leading-normal">
                  {item.summary}
                </div>
                <div className="flex gap-2 mt-1">
                  <span className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 text-[10px]">
                    Interest: {item.interest_level || 'N/A'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-md bg-white border text-[10px] ${
                    item.sentiment?.toLowerCase() === 'positive' 
                      ? 'border-emerald-200 text-emerald-700 font-semibold' 
                      : 'border-slate-200 text-slate-500'
                  }`}>
                    {item.sentiment || 'Neutral'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-slate-450 italic">
              {formData["Doctor Name"] 
                ? `No past records found for ${formData["Doctor Name"]}.` 
                : 'Select/enter a doctor name to load past interactions.'}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
