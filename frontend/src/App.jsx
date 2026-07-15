import React from 'react';
import { useSelector } from 'react-redux';
import ToggleTabs from './components/ToggleTabs';
import ManualForm from './components/ManualForm';
import ChatInterface from './components/ChatInterface';
import AIInsightsPanel from './components/AIInsightsPanel';
import Toast from './components/Toast';
import { Stethoscope, Sparkles, UserCheck } from 'lucide-react';

export default function App() {
  const activeTab = useSelector((state) => state.interaction.activeTab);
  const aiInsights = useSelector((state) => state.interaction.aiInsights);

  const confidencePct = aiInsights["Confidence Score"] 
    ? Math.round(aiInsights["Confidence Score"] * 100) 
    : null;

  return (
    <div className="min-h-screen text-slate-100 pb-12 flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      
      {/* 1. Header Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-inner">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-400 bg-clip-text text-transparent">
                  Mediket CRM
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold uppercase tracking-wider scale-90">
                  HCP Module
                </span>
              </div>
              <p className="text-[10px] text-slate-400">AI-First Interaction Logging for Medical Representatives</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-indigo-400" /> Alex Green
              </span>
              <span className="text-[10px] text-slate-400">Territory Representative</span>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-indigo-600/10 border border-indigo-400/25">
              AG
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex-1">
        
        {/* Toggle Mode Tabs */}
        <ToggleTabs />

        {/* Dynamic Display Columns */}
        {activeTab === 'form' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Left side: Structured Form */}
            <div className="lg:col-span-7">
              <ManualForm />
            </div>
            
            {/* Right side: Insights & Doctor History */}
            <div className="lg:col-span-5">
              <AIInsightsPanel />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Left side: Interactive Chat */}
            <div className="lg:col-span-6">
              <ChatInterface />
            </div>

            {/* Right side: Real-time Form Review & Compact Insights */}
            <div className="lg:col-span-6 space-y-6">
              {/* Compact AI Insights Card (so user doesn't lose sight of sentiment/priority extraction) */}
              {(aiInsights.Sentiment || aiInsights["Meeting Summary"]) && (
                <div className="p-4 bg-slate-900/60 border border-indigo-500/20 rounded-3xl backdrop-blur-md shadow-lg">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Staged AI Insights</h4>
                    </div>
                    {confidencePct && (
                      <span className="text-[10px] text-slate-400">
                        Confidence: <strong className="text-indigo-400">{confidencePct}%</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {aiInsights.Sentiment && (
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold border ${
                        aiInsights.Sentiment.toLowerCase().includes('positive') 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        Sentiment: {aiInsights.Sentiment}
                      </span>
                    )}
                    {aiInsights.Priority && (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        Priority: {aiInsights.Priority}
                      </span>
                    )}
                    {aiInsights["Risk Level"] && (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Risk: {aiInsights["Risk Level"]}
                      </span>
                    )}
                  </div>
                  {aiInsights["Meeting Summary"] && (
                    <p className="text-[11px] text-slate-400 leading-relaxed italic bg-slate-950/30 p-2.5 rounded-xl border border-slate-850">
                      "{aiInsights["Meeting Summary"]}"
                    </p>
                  )}
                  {aiInsights["Next Action Recommendation"] && (
                    <div className="mt-3 text-[11px] border-t border-slate-850 pt-2 text-indigo-300/80">
                      <strong>Next Action:</strong> {aiInsights["Next Action Recommendation"].replace(/^[-*\s]+/, '')}
                    </div>
                  )}
                </div>
              )}
              
              <div className="border border-slate-800 rounded-3xl overflow-hidden p-6 bg-slate-900/20 backdrop-blur-md">
                <div className="mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Review & Edit Form Fields</h4>
                  <p className="text-[10px] text-slate-500">Edit any details below that the AI extracted or missed before saving.</p>
                </div>
                <ManualForm />
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Global Slide-In Toast Notification */}
      <Toast />
    </div>
  );
}
