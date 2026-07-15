import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { hideToast } from '../store/interactionSlice';
import { CheckCircle, XCircle } from 'lucide-react';

export default function Toast() {
  const toast = useSelector((state) => state.interaction.toast);
  const dispatch = useDispatch();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        dispatch(hideToast());
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, dispatch]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all duration-300 animate-slide-in backdrop-blur-md bg-white border-slate-250 text-slate-800">
      {isSuccess ? (
        <CheckCircle className="h-5 w-5 text-emerald-600" />
      ) : (
        <XCircle className="h-5 w-5 text-rose-600" />
      )}
      <span className="text-sm font-medium text-slate-850">{toast.message}</span>
      <button
        onClick={() => dispatch(hideToast())}
        className="ml-2 text-slate-400 hover:text-slate-650 text-xs font-semibold"
      >
        ✕
      </button>
    </div>
  );
}
