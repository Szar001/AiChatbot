"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { DocumentTextIcon, Bars3Icon, ArrowPathIcon, MicrophoneIcon } from '@heroicons/react/24/outline';
import Sidebar from '../components/Sidebar';
import HeaderTabs from '../components/HeaderTabs';
import { authFetch, useAuthGuard } from '../../lib/auth';
import { useSpeechToText } from '../../lib/speech';
import { formatUtcPlus1 } from '../../lib/time';

const TEAM_BY_CATEGORY = {
  "Attack Security": "Attack Security",
  "Defence": "Defence Defenders",
  "Governance": "Governance",
};

function priorityFromTicket(ticket) {
  if (ticket.needs_human_review) return { label: "NEEDS REVIEW", styles: "text-amber-700 bg-amber-50 border-amber-200" };
  if (ticket.category === "Attack Security") return { label: "CRITICAL", styles: "text-red-700 bg-red-50 border-red-200" };
  if (ticket.category === "Defence") return { label: "HIGH", styles: "text-amber-700 bg-amber-50 border-amber-200" };
  return { label: "MEDIUM", styles: "text-yellow-700 bg-yellow-50 border-yellow-200" };
}

export default function Serviceteams() {
  const { user, checked } = useAuthGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [resolutionText, setResolutionText] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState(null);
  const [approvedDocument, setApprovedDocument] = useState(null);
  const [pendingEmail, setPendingEmail] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSendResult, setEmailSendResult] = useState(null);
  const [isUpdatingLifeDoc, setIsUpdatingLifeDoc] = useState(false);
  const [lifeDocUpdateError, setLifeDocUpdateError] = useState(null);
  const [lifeDocUpdated, setLifeDocUpdated] = useState(false);
  const [lifeDocRecord, setLifeDocRecord] = useState(null);

  const [incomingQueue, setIncomingQueue] = useState([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState(null);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [footprintAction, setFootprintAction] = useState("");
  const [isLoggingFootprint, setIsLoggingFootprint] = useState(false);
  const [footprintError, setFootprintError] = useState(null);

  const footprintSpeech = useSpeechToText((transcript) =>
    setFootprintAction((prev) => (prev ? `${prev} ${transcript}` : transcript))
  );
  const resolutionSpeech = useSpeechToText((transcript) =>
    setResolutionText((prev) => (prev ? `${prev} ${transcript}` : transcript))
  );

  const fetchQueue = useCallback(async () => {
    try {
      const response = await authFetch("/api/v1/tickets");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load incoming queue.");
      }
      const openTickets = (data.tickets || [])
        .filter((t) => t.status !== "CLOSED")
        .reverse();
      setIncomingQueue(openTickets);
      setQueueError(null);
    } catch (err) {
      setQueueError(err.message);
    } finally {
      setIsLoadingQueue(false);
    }
  }, []);

  const handleRefreshQueue = () => {
    setIsLoadingQueue(true);
    fetchQueue();
  };

  useEffect(() => {
    // fetchQueue only sets state after its internal `await` resolves; this is a standard
    // data-fetch-on-mount effect, not a synchronous setState call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (checked) fetchQueue();
  }, [checked, fetchQueue]);

  const handleSelectIncident = (incident) => {
    setSelectedIncident(incident);
    setResolutionText("");
    setApproveError(null);
    setApprovedDocument(null);
    setFootprintAction("");
    setFootprintError(null);
    setLifeDocUpdated(false);
    setLifeDocUpdateError(null);
    setLifeDocRecord(null);
  };

  const handleLogFootprint = async () => {
    const action = footprintAction.trim();
    if (!action || !selectedIncident) return;

    setIsLoggingFootprint(true);
    setFootprintError(null);
    try {
      const response = await authFetch(`/api/v1/tickets/${selectedIncident.ticket_id}/footprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to log triage action.");
      }
      setSelectedIncident(data.ticket);
      setIncomingQueue((prev) => prev.map((t) => (t.ticket_id === data.ticket.ticket_id ? data.ticket : t)));
      setFootprintAction("");
    } catch (err) {
      setFootprintError(err.message);
    } finally {
      setIsLoggingFootprint(false);
    }
  };

  const handleToggleHistory = async () => {
    setShowHistory((prev) => !prev);
    if (history.length > 0 || historyError) return;

    setIsLoadingHistory(true);
    try {
      const response = await authFetch("/api/v1/life-doc");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load history.");
      }
      setHistory((data.life_documents || []).filter((doc) => doc.reviewer === user.name));
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleApproveResolution = async () => {
    if (!selectedIncident || !resolutionText.trim()) return;

    setIsApproving(true);
    setApproveError(null);
    try {
      const response = await authFetch("/api/v1/approve-resolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: selectedIncident.ticket_id,
          resolution_text: resolutionText.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to approve resolution.");
      }

      setApprovedDocument(data.approved_resolution);
      setPendingEmail(data.pending_life_doc_email);
      setEmailSendResult(null);
      setLifeDocUpdated(false);
      setLifeDocUpdateError(null);
      setLifeDocRecord(null);
      fetchQueue();
    } catch (err) {
      setApproveError(err.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleUpdateLifeDoc = async () => {
    if (!approvedDocument) return;
    setIsUpdatingLifeDoc(true);
    setLifeDocUpdateError(null);
    try {
      const response = await authFetch(`/api/v1/tickets/${approvedDocument.ticket_id}/update-life-doc`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update life document.");
      }
      setLifeDocRecord(data.life_document);
      setLifeDocUpdated(true);
    } catch (err) {
      setLifeDocUpdateError(err.message);
    } finally {
      setIsUpdatingLifeDoc(false);
    }
  };

  const handleSendLifeDocEmail = async () => {
    if (!approvedDocument) return;
    setIsSendingEmail(true);
    try {
      const response = await authFetch(`/api/v1/tickets/${approvedDocument.ticket_id}/send-life-doc-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingEmail || {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to send email.");
      setEmailSendResult(data.result);
      setPendingEmail(null);
    } catch (err) {
      setEmailSendResult({ error: err.message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!checked) return null;

  return (
    <div className="h-screen w-screen bg-slate-50 font-sans flex flex-col antialiased overflow-hidden">
      {/* Dynamic Slide-out Sidebar Overlay */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* ==================== GLOBAL NAVBAR HEADER ==================== */}
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between flex-shrink-0 z-40">
        <div className="flex items-center gap-2">
          {/* Regular Menu Icon to open the Sidebar */}
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="p-2 rounded-lg hover:bg-slate-100 transition active:scale-95"
            aria-label="Open Navigation Menu"
          >
            <Bars3Icon className="w-6 h-6 text-slate-700" />
          </button>
        </div>

        {/* Center Pill Navigation Tabs */}
        <HeaderTabs />

        {/* Right Side User Profile Badge */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-slate-700 hidden sm:inline">{user.name}</span>
        </div>
      </header>

      {/* ==================== FULL-SCREEN CONTENT DASHBOARD ==================== */}
      <main className="flex-1 p-6 overflow-hidden w-full max-w-[1600px] mx-auto flex flex-col">
        
        {/* Main Interface Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden h-full min-h-0">
          
          {/* LEFT COLUMN: INCOMING QUEUE */}
          <div className="flex flex-col h-full border-r border-slate-200 min-h-0">
            {/* Column Title Section */}
            <div className="p-6 pb-4 border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-bold text-slate-900 tracking-tight">Incoming Queue</h2>
                <p className="text-slate-400 text-xs mt-0.5">Select a complaint to begin resolution</p>
              </div>
              <button
                onClick={handleRefreshQueue}
                disabled={isLoadingQueue}
                className="p-2 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
                aria-label="Refresh queue"
              >
                <ArrowPathIcon className={`w-5 h-5 text-slate-500 ${isLoadingQueue ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Scrollable Container for Incidents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white custom-scrollbar">
              {isLoadingQueue && (
                <p className="text-sm text-slate-400 font-medium">Loading incoming queue...</p>
              )}
              {queueError && (
                <p className="text-sm text-red-600 font-semibold">{queueError}</p>
              )}
              {!isLoadingQueue && !queueError && incomingQueue.length === 0 && (
                <p className="text-sm text-slate-400 font-medium">
                  No open tickets. Submit a request from the AI Chat page to populate this queue.
                </p>
              )}
              {incomingQueue.map((inc) => {
                const priority = priorityFromTicket(inc);
                return (
                  <div
                    key={inc.ticket_id}
                    onClick={() => handleSelectIncident(inc)}
                    className={`border rounded-xl p-5 space-y-3 bg-white transition-all cursor-pointer group shadow-2xs hover:shadow-xs hover:bg-slate-50/30 ${
                      selectedIncident?.ticket_id === inc.ticket_id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-100 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 tracking-wider">{inc.ticket_id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wide uppercase ${priority.styles}`}>
                        {priority.label}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-[16px] group-hover:text-blue-600 transition-colors">
                      {inc.clean_text?.slice(0, 80)}{inc.clean_text?.length > 80 ? "…" : ""}
                    </h4>

                    <p className="text-sm text-slate-500 leading-relaxed">
                      {inc.clean_text}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium">
                        {TEAM_BY_CATEGORY[inc.category] || inc.category || "Unclassified"}
                      </span>
                      <span className="px-2.5 py-1 bg-purple-50 border border-purple-100 text-purple-700 rounded-md text-xs font-semibold">
                        AI: {Math.round((inc.confidence || 0) * 100)}% confidence
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: RESOLUTION WORKSPACE */}
          <div className="bg-slate-50/40 flex flex-col h-full min-h-0">
            {/* Workspace Heading bar */}
            <div className="p-6 pb-4 border-b border-slate-100 bg-white flex-shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-[24px] font-bold text-slate-900 tracking-tight">Resolution Workspace</h2>
                <p className="text-slate-400 text-xs mt-0.5">Review and finalize incident resolution</p>
              </div>
              
              <button
                onClick={handleToggleHistory}
                className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 font-bold px-3 py-1.5 rounded-lg text-xs text-slate-700 shadow-2xs transition-all"
              >
                <DocumentTextIcon className="w-4 h-4 text-slate-400" />
                {showHistory ? "Hide History" : "My History"}
              </button>
            </div>

            {showHistory ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                <h3 className="font-bold text-slate-900 text-sm mb-2">Resolved Tickets History</h3>
                {isLoadingHistory && (
                  <p className="text-sm text-slate-400 font-medium">Loading...</p>
                )}
                {historyError && (
                  <p className="text-sm text-red-600 font-semibold">{historyError}</p>
                )}
                {!isLoadingHistory && !historyError && history.length === 0 && (
                  <p className="text-sm text-slate-400 font-medium">No resolved tickets yet.</p>
                )}
                {history.map((doc) => (
                  <div key={doc.id} className="border border-slate-100 rounded-xl p-4 bg-white">
                    <p className="text-xs font-semibold text-slate-400 tracking-wider">{doc.ticket_id}</p>
                    <p className="text-sm text-slate-700 mt-1 leading-relaxed">{doc.resolution_text}</p>
                    <p className="text-xs text-slate-400 mt-1.5">
                      Approved by {doc.reviewer} on {formatUtcPlus1(doc.approved_at)}
                    </p>
                    {doc.mitre_tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {doc.mitre_tags.map((tag) => (
                          <span key={tag} className="px-2.5 py-1 bg-purple-50 border border-purple-100 text-purple-700 rounded-md text-xs font-semibold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : !selectedIncident ? (
              /* Empty Center Screen Placeholder State */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-3xs mb-4">
                  <DocumentTextIcon className="w-8 h-8 text-slate-300 stroke-[1.25]" />
                </div>
                <p className="text-slate-400 font-medium text-sm tracking-wide max-w-[260px] leading-relaxed">
                  Select a complaint from the queue to begin
                </p>
              </div>
            ) : approvedDocument ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-5 space-y-2">
                  <h3 className="font-bold text-emerald-900 text-sm">Resolution Approved</h3>
                  <p className="text-xs text-emerald-700">Ticket {approvedDocument.ticket_id} closed by {approvedDocument.reviewer}.</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{approvedDocument.resolution_text}</p>
                </div>

                <div className={`border rounded-xl p-5 space-y-2 ${lifeDocUpdated ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white"}`}>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {lifeDocUpdated ? "Life Document Updated" : "Update Life Document"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lifeDocUpdated
                      ? "This is a distinct, audited step from the resolution approval above."
                      : "Approval alone does not update the Life Document — confirm this separately."}
                  </p>
                  {lifeDocRecord?.mitre_tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {lifeDocRecord.mitre_tags.map((tag) => (
                        <span key={tag} className="px-2.5 py-1 bg-purple-50 border border-purple-100 text-purple-700 rounded-md text-xs font-semibold">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {lifeDocUpdateError && (
                    <p className="text-red-600 text-xs font-semibold">{lifeDocUpdateError}</p>
                  )}
                  {!lifeDocUpdated && (
                    <button
                      onClick={handleUpdateLifeDoc}
                      disabled={isUpdatingLifeDoc}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                    >
                      {isUpdatingLifeDoc ? "Updating..." : "Update Life Document"}
                    </button>
                  )}
                </div>
                {pendingEmail && (
                  <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-5 space-y-2">
                    <h3 className="font-bold text-blue-900 text-sm">AI-Drafted Life Document Email — Pending Approval</h3>
                    <p className="text-xs text-blue-700 font-bold">{pendingEmail.subject}</p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{pendingEmail.body}</p>
                    <button
                      onClick={handleSendLifeDocEmail}
                      disabled={isSendingEmail}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                    >
                      {isSendingEmail ? "Sending..." : "Approve & Send to Requester"}
                    </button>
                  </div>
                )}
                {emailSendResult && !emailSendResult.error && (
                  <p className="text-xs text-emerald-700 font-semibold">
                    Email {emailSendResult.mode === "smtp" ? "sent" : "logged (no SMTP configured)"} to {emailSendResult.to}.
                  </p>
                )}
                {emailSendResult?.error && (
                  <p className="text-xs text-red-600 font-semibold">{emailSendResult.error}</p>
                )}
                <button
                  onClick={() => handleSelectIncident(null)}
                  className="text-sm font-bold text-slate-600 hover:text-blue-600"
                >
                  Back to queue
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-400 tracking-wider">{selectedIncident.ticket_id}</span>
                  <h3 className="font-bold text-slate-900 text-lg">
                    {TEAM_BY_CATEGORY[selectedIncident.category] || selectedIncident.category || "Unclassified"}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{selectedIncident.clean_text}</p>
                  {selectedIncident.needs_human_review && (
                    <span className="inline-block px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-700 rounded-md text-xs font-bold uppercase tracking-wide">
                      Flagged for human review — {Math.round((selectedIncident.confidence || 0) * 100)}% confidence
                    </span>
                  )}
                </div>

                {/* Active Triage Footprint */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                    Active Triage Footprint
                  </label>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 max-h-36 overflow-y-auto">
                    {(!selectedIncident.triage_footprint || selectedIncident.triage_footprint.length === 0) && (
                      <p className="text-xs text-slate-400">No actions logged yet.</p>
                    )}
                    {selectedIncident.triage_footprint?.map((entry, idx) => (
                      <p key={idx} className="text-xs text-slate-600">
                        <span className="font-mono text-slate-400">
                          [{formatUtcPlus1(entry.timestamp)}]
                        </span>{" "}
                        <span className="font-semibold text-slate-700">{entry.actor}</span> {entry.action}
                      </p>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={footprintAction}
                      onChange={(e) => setFootprintAction(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLogFootprint()}
                      placeholder="e.g. Running Nessus vulnerability sweep..."
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={footprintSpeech.isListening ? footprintSpeech.stopListening : footprintSpeech.startListening}
                      disabled={!footprintSpeech.isSupported}
                      title={footprintSpeech.isSupported ? "Speak this action" : "Speech-to-text not supported in this browser"}
                      className={`px-2.5 py-2 rounded-lg border transition ${
                        footprintSpeech.isListening
                          ? "bg-red-500 border-red-500 text-white animate-pulse"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      } disabled:opacity-50`}
                    >
                      <MicrophoneIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleLogFootprint}
                      disabled={isLoggingFootprint || !footprintAction.trim()}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                    >
                      {isLoggingFootprint ? "Logging..." : "Log Action"}
                    </button>
                  </div>
                  {footprintError && <p className="text-red-600 text-xs font-semibold">{footprintError}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                      Resolution Details
                    </label>
                    <button
                      onClick={resolutionSpeech.isListening ? resolutionSpeech.stopListening : resolutionSpeech.startListening}
                      disabled={!resolutionSpeech.isSupported}
                      title={resolutionSpeech.isSupported ? "Speak your resolution" : "Speech-to-text not supported in this browser"}
                      className={`p-1.5 rounded-md border transition ${
                        resolutionSpeech.isListening
                          ? "bg-red-500 border-red-500 text-white animate-pulse"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      } disabled:opacity-50`}
                    >
                      <MicrophoneIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Describe the technical resolution applied to this incident..."
                    className="w-full min-h-[160px] bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {approveError && (
                  <p className="text-red-600 text-sm font-semibold">{approveError}</p>
                )}

                <button
                  onClick={handleApproveResolution}
                  disabled={isApproving || !resolutionText.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApproving ? "Approving..." : "Approve Resolution"}
                </button>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
