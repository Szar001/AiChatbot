"use client"
import Image from "next/image";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bars3Icon,
  PaperClipIcon, 
  MicrophoneIcon, 
  PaperAirplaneIcon, 
  PhotoIcon, 
  FolderIcon, 
  SpeakerWaveIcon, 
  QuestionMarkCircleIcon, 
  CompassIcon 
} from '@heroicons/react/24/outline';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Sidebar from "./components/Sidebar";
import HeaderTabs from "./components/HeaderTabs";
import { authFetch, useAuthGuard } from "../lib/auth";
import { useSpeechToText } from "../lib/speech";

function downloadCitation(citation) {
  const content = `${citation.source} — ${citation.clause}\n\n${citation.text}`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${citation.source.replace(/\s+/g, "_")}_${citation.clause.replace(/\s+/g, "_")}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SecuritySOCDesk() {
  const { user, checked } = useAuthGuard();
  const [message, setMessage] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isListening, isSupported: speechSupported, error: speechError, startListening, stopListening } = useSpeechToText(
    (transcript) => setMessage((prev) => (prev ? `${prev} ${transcript}` : transcript))
  );

  const handleSendMessage = async () => {
    const text = message.trim();
    if (!text || isSubmitting) return;

    setIsSubmitting(true);
    const userEntry = { role: "user", text, timestamp: new Date().toLocaleTimeString() };
    setChatLog((prev) => [...prev, userEntry]);
    setMessage("");

    try {
      const response = await authFetch("/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process your message.");
      }

      if (data.type === "answer") {
        // Policy / scenario question answered from the organisation's RAG corpus.
        setChatLog((prev) => [
          ...prev,
          {
            role: "ai",
            text: data.answer,
            citations: data.citations || [],
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else {
        // Incident / request -> ticket categorisation (+ action script for threats).
        const { ticket, action_script } = data;
        const aiSummary = ticket.needs_human_review
          ? `Ticket ${ticket.ticket_id} created. Classification confidence (${Math.round(ticket.confidence * 100)}%) was below threshold, so this has been flagged for manual human review under "${ticket.category}".`
          : `Ticket ${ticket.ticket_id} created and auto-routed to "${ticket.category}" with ${Math.round(ticket.confidence * 100)}% confidence.`;

        setChatLog((prev) => [
          ...prev,
          { role: "ai", text: aiSummary, timestamp: new Date().toLocaleTimeString() },
        ]);

        if (action_script) {
          setChatLog((prev) => [
            ...prev,
            { role: "ai", actionScript: action_script, timestamp: new Date().toLocaleTimeString() },
          ]);
        }
      }
    } catch (err) {
      setChatLog((prev) => [
        ...prev,
        { role: "ai", text: `Error: ${err.message}`, timestamp: new Date().toLocaleTimeString() },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkNotifications = useCallback(async () => {
    try {
      const response = await authFetch("/api/v1/notifications");
      const data = await response.json();
      if (!response.ok || !data.notifications?.length) return;

      for (const ticket of data.notifications) {
        setChatLog((prev) => [
          ...prev,
          {
            role: "ai",
            text: `Your request "${ticket.clean_text?.slice(0, 70)}${ticket.clean_text?.length > 70 ? "…" : ""}" (${ticket.ticket_id}) has been resolved by ${ticket.reviewer}: ${ticket.resolution_text}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        await authFetch("/api/v1/notifications/ack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket_id: ticket.ticket_id }),
        });
      }
    } catch {
      // Polling is best-effort; a failed check just retries on the next interval.
    }
  }, []);

  useEffect(() => {
    if (!checked) return;
    checkNotifications();
    const interval = setInterval(checkNotifications, 8000);
    return () => clearInterval(interval);
  }, [checked, checkNotifications]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  if (!checked) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col antialiased selection:bg-blue-500 selection:text-white">
      <Sidebar isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}/>

      {/* TOP NAVIGATION BAR */}
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-50">
        {/* Left Logo Section */}
        <button
  onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 transition">
  <Bars3Icon className="w-7 h-7 text-slate-700" />
</button>

        {/* Center Navigation Toggle */}
        <HeaderTabs />

        {/* Right User Profile */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm shadow-sm ring-2 ring-transparent group-hover:ring-blue-100 transition-all">
            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors hidden sm:inline">
            {user.name}
          </span>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-center">
        
        {/* CHAT INTERFACE CARD */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-100 border border-slate-200/80 overflow-hidden flex flex-col min-h-[600px] md:min-h-[650px] w-full">
          
          {/* Card Header */}
          <div className="bg-[#1a2333] px-6 py-8 text-center border-b border-slate-800">
            <h1 className="text-white text-xl sm:text-2xl font-bold tracking-tight mb-1">
              Autonomous Cybersecurity Operations Center Desk
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-medium tracking-wide">
              AI-Powered Security Operations & Incident Response
            </p>
          </div>

          {/* Chat Bubble Area */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-white">
            <div className="flex items-start gap-4 max-w-3xl">
              {/* Bot Avatar */}
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm">
                AI
              </div>

              {/* Message Content */}
              <div className="flex flex-col gap-1.5">
                <div className="bg-slate-50 text-slate-800 text-sm sm:text-[15px] leading-relaxed p-4 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm">
                  Welcome to Sterling Trust Bank&apos;s private Cybersecurity Operations Desk. This is a dedicated AI for your organisation — it reasons only over your own policies and makes no external calls, so your data stays in-house. You can <strong>report an incident or request</strong> (I&apos;ll categorise and route it, and draft a Technical Action Script for active threats), or <strong>ask a policy/scenario question</strong> (I&apos;ll answer from your policy library and attach the source snippet). How can I help?
                </div>
                <span className="text-[11px] text-slate-400 font-medium pl-1">
                  09:24:05
                </span>
              </div>
            </div>

            {chatLog.map((entry, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-4 max-w-3xl ${entry.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm ${
                    entry.role === "user" ? "bg-slate-700 text-white" : "bg-blue-600 text-white"
                  }`}
                >
                  {entry.role === "user" ? "JD" : "AI"}
                </div>
                <div className={`flex flex-col gap-1.5 ${entry.role === "user" ? "items-end" : ""}`}>
                  {entry.actionScript ? (
                    <div className="text-sm sm:text-[15px] leading-relaxed p-4 rounded-2xl rounded-tl-sm shadow-sm border bg-slate-900 text-slate-100 border-slate-800 font-mono max-w-md">
                      <p className="text-amber-400 font-bold text-xs uppercase tracking-wide mb-2">
                        {entry.actionScript.title}
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5">
                        {entry.actionScript.steps.map((step, sIdx) => (
                          <li key={sIdx}>{step}</li>
                        ))}
                      </ol>
                      {entry.actionScript.policy_basis?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5">
                            Grounded in your policies
                          </p>
                          {entry.actionScript.policy_basis.map((ref, rIdx) => (
                            <button
                              key={rIdx}
                              onClick={() => downloadCitation(ref)}
                              title="Download source snippet"
                              className="flex items-center gap-1.5 text-[11px] text-blue-300 hover:text-blue-200 transition"
                            >
                              <ArrowDownTrayIcon className="w-3 h-3" />
                              {ref.source} — {ref.clause}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`text-sm sm:text-[15px] leading-relaxed p-4 rounded-2xl shadow-sm border whitespace-pre-line ${
                        entry.role === "user"
                          ? "bg-blue-600 text-white border-blue-600 rounded-tr-sm"
                          : "bg-slate-50 text-slate-800 border-slate-100 rounded-tl-sm"
                      }`}
                    >
                      {entry.text}
                    </div>
                  )}

                  {entry.citations?.length > 0 && (
                    <div className="flex flex-col gap-1.5 max-w-md">
                      {entry.citations.map((cite, cIdx) => (
                        <div
                          key={cIdx}
                          className="bg-white border border-slate-200 rounded-xl p-3 text-xs shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800">{cite.source} — {cite.clause}</span>
                            <button
                              onClick={() => downloadCitation(cite)}
                              title="Download raw source snippet"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold flex-shrink-0"
                            >
                              <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                              Snippet
                            </button>
                          </div>
                          <p className="text-slate-500 mt-1 leading-relaxed line-clamp-3">{cite.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <span className="text-[11px] text-slate-400 font-medium pl-1">{entry.timestamp}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Inputs & Action Footer */}
          <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex flex-col gap-3">

            {(isListening || speechError) && (
              <div className="w-full max-w-4xl mx-auto -mb-1">
                {isListening && (
                  <p className="text-xs font-semibold text-red-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Listening… speak now, your words will appear in the box.
                  </p>
                )}
                {!isListening && speechError && (
                  <p className="text-xs font-semibold text-amber-600">{speechError}</p>
                )}
              </div>
            )}

            {/* Input Row */}
            <div className="flex items-center gap-3 w-full max-w-4xl mx-auto">
              {/* Attachment Button */}
              <button
                disabled
                title="File attachments coming soon"
                className="p-3 bg-white rounded-full border border-slate-200 text-slate-300 shadow-sm flex-shrink-0 cursor-not-allowed opacity-60"
              >
                <PaperClipIcon className="w-5 h-5" />
              </button>

              {/* Text Area Input */}
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  placeholder="Type your security query or request..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSubmitting}
                  className="w-full bg-slate-100 hover:bg-slate-200/60 focus:bg-white text-slate-800 placeholder-slate-400 text-sm rounded-2xl pl-4 pr-4 py-3.5 border border-transparent focus:border-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all disabled:opacity-60"
                />
              </div>

              {/* Voice Button */}
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={!speechSupported || isSubmitting}
                title={speechSupported ? (isListening ? "Stop listening" : "Speak your request") : "Speech-to-text not supported in this browser"}
                className={`p-3 rounded-full border shadow-sm flex-shrink-0 transition-all ${
                  isListening
                    ? "bg-red-500 border-red-500 text-white animate-pulse"
                    : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                } ${!speechSupported ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <MicrophoneIcon className="w-5 h-5" />
              </button>

              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={isSubmitting || !message.trim()}
                className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-all shadow-md hover:shadow-blue-200 active:scale-95 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PaperAirplaneIcon className="w-5 h-5 -rotate-45 relative left-[1px] bottom-[1px]" />
              </button>
            </div>

            {/* Media/File Metadata Shortcuts */}
            <div className="flex items-center justify-center gap-6 text-slate-300 text-xs font-medium py-1">
              <button disabled title="Coming soon" className="flex items-center gap-1.5 cursor-not-allowed">
                <PhotoIcon className="w-4 h-4 text-slate-300" />
                Images
              </button>
              <button disabled title="Coming soon" className="flex items-center gap-1.5 cursor-not-allowed">
                <FolderIcon className="w-4 h-4 text-slate-300" />
                Folders
              </button>
              <button disabled title="Coming soon" className="flex items-center gap-1.5 cursor-not-allowed">
                <SpeakerWaveIcon className="w-4 h-4 text-slate-300" />
                Audio
              </button>
            </div>

          </div>
        </div>
      </main>

      {/* PERSISTENT HELP FLOAT ICON */}
      <footer className="fixed bottom-5 right-5 z-50">
        <button disabled title="Help — coming soon" className="p-2.5 bg-slate-900 rounded-full text-white shadow-lg opacity-60 cursor-not-allowed">
          <QuestionMarkCircleIcon className="w-6 h-6" />
        </button>
      </footer>
    </div>
  );
}