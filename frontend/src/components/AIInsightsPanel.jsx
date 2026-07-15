import React from 'react';
import { useSelector } from 'react-redux';
import { Sparkles, BarChart2, ShieldAlert, Award, FileText, ChevronRight, Activity } from 'lucide-react';

export default function AIInsightsPanel() {
  const aiInsights = useSelector((state) => state.interaction.aiInsights);
  const doctorHistory = useSelector((state) => state.interaction.doctorHistory);
  const formData = useSelector((state) => state.interaction.formData);

  const getSentimentColor = (sentiment) => {
    if (!sentiment) return 'bg-slate-800 text-slate-400 border-slate-700';
    const s = sentiment.toLowerCase();
    if (s.includes('positive')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (s.includes('negative')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  const getPriorityColor = (priority) => {
    if (!priority) return 'bg-slate-800 text-slate-400 border-slate-700';
    const p = priority.toLowerCase();
    if (p.includes('urgent')) return 'bg-rose-600/20 text-rose-400 border-rose-600/30 animate-pulse';
    if (p.includes('high')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    if (p.includes('medium')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  const getRiskColor = (risk) => {
    if (!risk) return 'bg-slate-800 text-slate-400 border-slate-700';
    const r = risk.toLowerCase();
    if (r.includes('high')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (r.includes('medium')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  };

  const confidencePct = aiInsights["Confidence Score"] 
    ? Math.round(aiInsights["Confidence Score"] * 100) 
    : null;

  return (
    <div className="space-y-6">
      
      {/* 1. AI Insights Metrics Card */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">AI Judgments & Insights</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Sentiment */}
          <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-850 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <Activity className="h-3 w-3" /> Sentiment
            </span>
            <div className={`text-center py-1 rounded-xl text-xs font-semibold border ${getSentimentColor(aiInsights["Sentiment"])}`}>
              {aiInsights["Sentiment"] || 'Pending...'}
            </div>
          </div>

          {/* Priority */}
          <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-850 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Priority
            </span>
            <div className={`text-center py-1 rounded-xl text-xs font-semibold border ${getPriorityColor(aiInsights["Priority"])}`}>
              {aiInsights["Priority"] || 'Pending...'}
            </div>
          </div>

          {/* Risk Level */}
          <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-850 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Risk Level
            </span>
            <div className={`text-center py-1 rounded-xl text-xs font-semibold border ${getRiskColor(aiInsights["Risk Level"])}`}>
              {aiInsights["Risk Level"] || 'Pending...'}
            </div>
          </div>

          {/* Confidence Score */}
          <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-850 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <Award className="h-3 w-3" /> Confidence
            </span>
            <div className="text-center py-1 rounded-xl text-xs font-semibold border border-indigo-500/10 bg-indigo-500/5 text-indigo-300">
              {confidencePct ? `${confidencePct}%` : 'Pending...'}
            </div>
          </div>
        </div>

        {/* Meeting Summary */}
        <div className="space-y-1.5 mb-4">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" /> Meeting Summary
          </span>
          <div className="p-3 bg-slate-950/30 border border-slate-850 rounded-2xl text-xs text-slate-400 leading-relaxed min-h-[60px]">
            {aiInsights["Meeting Summary"] || 'Save the interaction or use Chat with AI to automatically generate a summary.'}
          </div>
        </div>

        {/* Next Best Action Recommendations */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
            <BarChart2 className="h-3.5 w-3.5" /> Recommended Next Steps
          </span>
          <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl text-xs text-indigo-300/85 leading-relaxed min-h-[80px]">
            {aiInsights["Next Action Recommendation"] ? (
              <ul className="list-disc pl-4 space-y-1">
                {aiInsights["Next Action Recommendation"].split('\n').map((line, idx) => {
                  const cleaned = line.replace(/^[-\s*]+/, '').trim();
                  if (!cleaned) return null;
                  return <li key={idx}>{cleaned}</li>;
                })}
              </ul>
            ) : (
              <span className="text-slate-500">Provide details or run AI extraction to see compliance-approved suggestions.</span>
            )}
          </div>
        </div>

      </div>

      {/* 2. Doctor History Card */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Doctor History</h3>
          </div>
          {formData["Doctor Name"] && (
            <span className="text-xxs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {formData["Doctor Name"]}
            </span>
          )}
        </div>

        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
          {doctorHistory.length > 0 ? (
            doctorHistory.map((item) => (
              <div key={item.id} className="p-3 bg-slate-950/40 border border-slate-850 rounded-2xl hover:border-slate-800 transition-all flex flex-col gap-1 text-[11px]">
                <div className="flex justify-between items-center text-slate-400 font-semibold mb-1">
                  <span className="text-indigo-400">{item.product_discussed}</span>
                  <span>{item.meeting_date}</span>
                </div>
                <div className="text-slate-300 leading-normal">
                  {item.summary}
                </div>
                <div className="flex gap-2 mt-1">
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-500 text-[10px]">
                    Interest: {item.interest_level || 'N/A'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded-md bg-slate-900 border text-[10px] ${
                    item.sentiment?.toLowerCase() === 'positive' 
                      ? 'border-emerald-500/20 text-emerald-400' 
                      : 'border-slate-800 text-slate-500'
                  }`}>
                    {item.sentiment || 'Neutral'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-slate-500">
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
