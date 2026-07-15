import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveTab } from '../store/interactionSlice';
import { ClipboardList, MessageSquareText } from 'lucide-react';

export default function ToggleTabs() {
  const activeTab = useSelector((state) => state.interaction.activeTab);
  const dispatch = useDispatch();

  return (
    <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-850 backdrop-blur-md max-w-sm mx-auto mb-6 shadow-xl">
      <button
        onClick={() => dispatch(setActiveTab('form'))}
        className={`flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
          activeTab === 'form'
            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
        }`}
      >
        <ClipboardList className="h-4 w-4" />
        Fill Form
      </button>
      <button
        onClick={() => dispatch(setActiveTab('chat'))}
        className={`flex items-center justify-center gap-2 flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
          activeTab === 'chat'
            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
        }`}
      >
        <MessageSquareText className="h-4 w-4" />
        Chat with AI
      </button>
    </div>
  );
}
