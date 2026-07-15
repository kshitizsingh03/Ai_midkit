import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveTab } from './store/interactionSlice';
import ManualForm from './components/ManualForm';
import ChatInterface from './components/ChatInterface';
import AIInsightsPanel from './components/AIInsightsPanel';
import Toast from './components/Toast';
import HistoryDrawer from './components/HistoryDrawer';
import { Stethoscope, UserCheck, Bot, BarChart2, History } from 'lucide-react';

export default function App() {
  const activeTab = useSelector((state) => state.interaction.activeTab);
  const dispatch = useDispatch();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <div className="min-h-screen text-slate-800 pb-12 flex flex-col bg-slate-50">
      
      {/* 1. Header Navigation Bar (Light Mode) */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-slate-900">
                  Mediket CRM
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold uppercase tracking-wider scale-90">
                  HCP Module
                </span>
              </div>
              <p className="text-[10px] text-slate-500">AI-First Interaction Logging for Medical Representatives</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all bg-white shadow-sm"
            >
              <History className="h-4 w-4 text-indigo-600" />
              View History
            </button>

            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-indigo-600" /> Alex Green
              </span>
              <span className="text-[10px] text-slate-500">Territory Representative</span>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-sm shadow-sm border border-indigo-200">
              AG
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex-1">
        
        {/* Dynamic Display Columns: Form always on the left, Assistant / Insights on the right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left side: Structured Form (Always Visible) */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Log HCP Interaction</h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                     Record details, topics, and actions. The form will sync automatically as you chat.
                  </p>
                </div>
              </div>
              <ManualForm />
            </div>
          </div>
          
          {/* Right side: AI Panel (Tabbed Switch between Assistant Chat and Insights & History) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Tab Switches */}
            <div className="flex bg-slate-200/50 p-1 rounded-2xl border border-slate-200 backdrop-blur-md w-full shadow-inner">
              <button
                type="button"
                onClick={() => dispatch(setActiveTab('chat'))}
                className={`flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                  activeTab === 'chat' || activeTab === 'form' // Safe default fallback
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/30 font-bold'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <Bot className="h-4 w-4" />
                AI Assistant Chat
              </button>
              <button
                type="button"
                onClick={() => dispatch(setActiveTab('insights'))}
                className={`flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                  activeTab === 'insights'
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/30 font-bold'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-white/40'
                }`}
              >
                <BarChart2 className="h-4 w-4" />
                Insights & History
              </button>
            </div>

            {/* Tab Contents */}
            <div className="transition-all duration-350">
              {activeTab === 'chat' || activeTab === 'form' ? (
                <ChatInterface />
              ) : (
                <AIInsightsPanel />
              )}
            </div>
            
          </div>
        </div>

      </main>

      {/* Slide-out Drawer for All Interactions History */}
      <HistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

      {/* Global Slide-In Toast Notification */}
      <Toast />
    </div>
  );
}
