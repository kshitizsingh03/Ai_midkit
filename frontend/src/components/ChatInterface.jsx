import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { addChatMessage, updateAllFormData, setAiInsights, setStatus, showToast, setDoctorHistory, setCurrentInteractionId } from '../store/interactionSlice';
import axios from 'axios';
import { Send, Bot, User, Sparkles, Loader, Mic, MicOff } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Browser Web Speech API (free, no paid STT service) — may be unavailable in some browsers (e.g. Firefox)
const SpeechRecognitionAPI = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

export default function ChatInterface() {
  const chatMessages = useSelector((state) => state.interaction.chatMessages);
  const status = useSelector((state) => state.interaction.status);
  const currentInteractionId = useSelector((state) => state.interaction.currentInteractionId);
  const formData = useSelector((state) => state.interaction.formData);
  const dispatch = useDispatch();

  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Set up speech recognition once
  useEffect(() => {
    if (!SpeechRecognitionAPI) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInputValue(transcript);
      // Once the browser finalizes the phrase, auto-send it so the rep doesn't need an extra click
      if (event.results[event.results.length - 1].isFinal) {
        setTimeout(() => {
          submitTranscript(transcript);
        }, 150);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      dispatch(showToast({ type: 'error', message: 'Could not access microphone. Please check browser permissions.' }));
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleListening = () => {
    if (!SpeechRecognitionAPI) {
      dispatch(showToast({ type: 'error', message: 'Voice input is not supported in this browser. Try Chrome or Edge.' }));
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInputValue('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const submitTranscript = async (transcriptText) => {
    if (!transcriptText.trim()) return;
    await sendToBackend(transcriptText);
    setInputValue('');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userText = inputValue;
    setInputValue('');
    await sendToBackend(userText);
  };

  const sendToBackend = async (userText) => {
    dispatch(addChatMessage({ sender: 'user', text: userText }));
    dispatch(setStatus('loading'));

    try {
      const response = await axios.post(`${API_URL}/interaction/chat`, {
        text: userText,
        current_data: formData,
        ai_insights: aiInsights
      });

      const { extracted_data, ai_insights, message, doctor_history } = response.data;

      // Update state if returned
      if (extracted_data) {
        dispatch(updateAllFormData(extracted_data));
      }
      if (ai_insights) {
        dispatch(setAiInsights(ai_insights));
      }
      if (doctor_history) {
        dispatch(setDoctorHistory(doctor_history));
      }
      
      // If it was a save or extraction that staged an ID (edit endpoint returns staged updates)
      if (response.data.id) {
        dispatch(setCurrentInteractionId(response.data.id));
      }

      // Add AI reply message
      let replyMessage = message;
      if (!replyMessage) {
        replyMessage = extracted_data
          ? "I have successfully analyzed the details and updated the form on the right. Please review the details, verify the AI Insights, and click 'Save Log' when ready!"
          : "I have successfully processed your request.";
      }
      
      dispatch(addChatMessage({ sender: 'ai', text: replyMessage }));
      dispatch(showToast({ type: 'success', message: extracted_data ? 'Form updated!' : 'Query processed!' }));

      // Fetch history for doctor if name was extracted and doctor_history was not returned directly
      if (extracted_data && extracted_data["Doctor Name"] && !doctor_history) {
        try {
          const historyRes = await axios.get(`${API_URL}/doctor/history`, {
            params: { doctor_name: extracted_data["Doctor Name"] }
          });
          dispatch(setDoctorHistory(historyRes.data));
        } catch (err) {
          console.error("Failed to fetch doctor history:", err);
        }
      }

      dispatch(setStatus('success'));
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.detail || 'Something went wrong during extraction. Please verify the backend is running.';
      dispatch(addChatMessage({ sender: 'ai', text: `Sorry, I encountered an error: ${errMsg}` }));
      dispatch(showToast({ type: 'error', message: errMsg }));
      dispatch(setStatus('error'));
    }
  };

  return (
    <div className="flex flex-col h-[650px] bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
      
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-slate-900/60 border-b border-slate-850">
        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Conversational Log Assistant</h3>
          <p className="text-xxs text-slate-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-indigo-400 animate-pulse" /> Powered by LangGraph + Groq API
          </p>
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {chatMessages.map((msg) => {
          const isAI = msg.sender === 'ai';
          return (
            <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-xs font-semibold ${
                isAI 
                  ? 'bg-indigo-600/20 border border-indigo-500/20 text-indigo-400' 
                  : 'bg-violet-600/20 border border-violet-500/20 text-violet-400'
              }`}>
                {isAI ? <Bot className="h-4.5 w-4.5" /> : <User className="h-4.5 w-4.5" />}
              </div>
              <div className={`p-4 rounded-2xl text-xs leading-relaxed border ${
                isAI 
                  ? 'bg-slate-900/60 border-slate-850 text-slate-300 rounded-tl-none' 
                  : 'bg-indigo-600/10 border-indigo-500/20 text-indigo-200 rounded-tr-none'
              }`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        {status === 'loading' && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-center">
            <div className="h-8 w-8 rounded-lg bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/40 border border-slate-850 rounded-2xl rounded-tl-none text-xs text-slate-400">
              <Loader className="h-3.5 w-3.5 animate-spin text-indigo-400" />
              <span>AI is thinking & extracting data fields...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Suggestion Chips */}
      <div className="px-4 py-2 bg-slate-950/20 border-t border-slate-850 flex flex-wrap gap-2">
        {[
          { label: "🎙️ Log Meeting", text: "Today I met Dr. Sanjay Sharma at City Hospital. We discussed CardioPlus. Doctor was very interested and positive about it. Schedule follow-up after two weeks at 10 AM." },
          { label: "✏️ Change Doctor", text: "Actually, change the doctor name to Dr. Sanjay Sharma." },
          { label: "✏️ Change Time", text: "Set meeting time to 11:30 AM." },
          { label: "📋 Show History", text: "Show previous interactions with Dr. Sanjay Sharma." }
        ].map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setInputValue(chip.text)}
            className="px-2.5 py-1 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-[10px] text-slate-400 hover:text-indigo-300 transition-all font-medium"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Speech wave visualizer */}
      {isListening && (
        <div className="flex items-center justify-center gap-1.5 py-2.5 bg-rose-500/5 border-t border-rose-500/10">
          <span className="text-[10px] text-rose-450 font-bold tracking-wider animate-pulse mr-2">RECORDING VOICE INPUT:</span>
          <div className="w-0.5 h-4 bg-rose-500 rounded-full origin-bottom animate-wave-1"></div>
          <div className="w-0.5 h-6 bg-rose-500 rounded-full origin-bottom animate-wave-2"></div>
          <div className="w-0.5 h-3 bg-rose-500 rounded-full origin-bottom animate-wave-3"></div>
          <div className="w-0.5 h-7 bg-rose-500 rounded-full origin-bottom animate-wave-4"></div>
          <div className="w-0.5 h-4 bg-rose-500 rounded-full origin-bottom animate-wave-5"></div>
        </div>
      )}

      {/* Chat Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-slate-900/60 border-t border-slate-850">
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? "Stop listening" : "Speak your meeting notes"}
            className={`flex-shrink-0 p-3 rounded-2xl border transition-all ${
              isListening
                ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                : 'bg-slate-950/60 border-slate-800 text-indigo-400 hover:border-indigo-500 hover:bg-indigo-500/10'
            }`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={status === 'loading'}
              placeholder={isListening ? "Listening... speak now" : "Type or click the mic to speak your meeting notes..."}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl pl-4 pr-12 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={status === 'loading' || !inputValue.trim()}
              className="absolute right-2.5 top-2.5 p-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>

    </div>
  );
}
