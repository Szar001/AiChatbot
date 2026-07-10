"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { ClockIcon, UserIcon, ChevronDownIcon, Bars3Icon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Sidebar from "../components/Sidebar"
import HeaderTabs from "../components/HeaderTabs"
import { authFetch, useAuthGuard } from "../../lib/auth"

const STATUS_STYLES = {
  ONGOING: 'bg-[#3b82f6] text-white',
  PENDING_REVIEW: 'bg-[#f59e0b] text-white',
  CLOSED: 'bg-[#10b981] text-white',
};

const TEAM_STYLES = {
  "Attack Security": 'bg-[#fef2f2] text-[#b91c1c] border-[#fee2e2]',
  "Governance": 'bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]',
  "Defence": 'bg-[#eff6ff] text-[#1d4ed8] border-[#dbeafe]',
};

function elapsedSince(isoTimestamp) {
  const created = new Date(isoTimestamp).getTime();
  const diffMs = Math.max(Date.now() - created, 0);
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

export default function RequestsPage() {
  const { user, checked } = useAuthGuard();
  const [filter, setFilter] = useState('All Requests');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [lifeDocs, setLifeDocs] = useState({});
  const [lifeDocErrors, setLifeDocErrors] = useState({});

  const [requestsData, setRequestsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchTickets = useCallback(async () => {
    try {
      const response = await authFetch("/api/v1/tickets");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load requests.");
      }
      setRequestsData((data.tickets || []).slice().reverse());
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefreshTickets = () => {
    setIsLoading(true);
    fetchTickets();
  };

  useEffect(() => {
    if (checked) fetchTickets();
  }, [checked, fetchTickets]);

  const handleViewLifeDocument = async (reqId) => {
    if (expandedId === reqId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(reqId);

    if (lifeDocs[reqId] || lifeDocErrors[reqId]) return;

    try {
      const response = await authFetch(`/api/v1/life-doc/${reqId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No life document found for this ticket yet.");
      }
      setLifeDocs((prev) => ({ ...prev, [reqId]: data.life_document }));
    } catch (err) {
      setLifeDocErrors((prev) => ({ ...prev, [reqId]: err.message }));
    }
  };

  // Filter logic mapped onto live backend ticket statuses
  const filteredData = requestsData.filter(req => {
    if (filter === 'All Requests') return true;
    if (filter === 'Ongoing') return req.status === 'ONGOING';
    if (filter === 'Pending') return req.status === 'PENDING_REVIEW';
    if (filter === 'Closed') return req.status === 'CLOSED';
    if (filter === 'Escalated') return req.needs_human_review;
    return true;
  });

  if (!checked) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col antialiased">
      {/* Re-inject persistent sidebar layout sync */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* PERSISTENT NAV BAR FRAME */}
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 transition">
          <Bars3Icon className="w-7 h-7 text-slate-700" />
        </button>

        <HeaderTabs />

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
        </div>
      </header>

      {/* CORE REQUESTS CONTENT CONTENT */}
      <main className="w-full space-y-6 max-w-7xl mx-auto p-6 flex-1">
        <div>
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight">Requests Management</h1>
          <p className="text-slate-500 text-[15px] mt-1">Monitor and track all security requests and incidents</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 items-center">
          {['All Requests', 'Ongoing', 'Pending', 'Closed', 'Escalated'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-xl border text-sm font-medium transition-all ${
                filter === tab
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm font-semibold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
          <button
            onClick={handleRefreshTickets}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
            aria-label="Refresh requests"
          >
            <ArrowPathIcon className={`w-5 h-5 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {loadError && (
          <p className="text-red-600 text-sm font-semibold">{loadError}</p>
        )}
        {isLoading && (
          <p className="text-slate-400 text-sm font-medium">Loading requests...</p>
        )}
        {!isLoading && !loadError && filteredData.length === 0 && (
          <p className="text-slate-400 text-sm font-medium">
            No requests match this filter. Submit a request from the AI Chat page to populate this list.
          </p>
        )}

        {/* Requests Dynamic Cards */}
        <div className="space-y-4">
          {filteredData.map((req) => (
            <div key={req.ticket_id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 tracking-wider block">{req.ticket_id}</span>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                    {req.clean_text?.slice(0, 90)}{req.clean_text?.length > 90 ? "…" : ""}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-6 lg:gap-12 text-[14px]">
                  <div className="flex flex-col gap-1 min-w-[100px]">
                    <span className={`px-3 py-1 rounded-md text-center text-[11px] font-bold tracking-wider ${STATUS_STYLES[req.status] || 'bg-slate-400 text-white'}`}>
                      {req.status?.replace("_", " ")}
                    </span>
                    {req.needs_human_review && (
                      <span className="px-2 py-1 bg-[#f97316] text-white text-[10px] font-bold rounded-md tracking-wide text-center whitespace-nowrap">
                        Escalated to Humans
                      </span>
                    )}
                    {req.urgency && (
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-md tracking-wide text-center whitespace-nowrap ${
                        req.urgency === "Critical" ? "bg-red-600 text-white"
                        : req.urgency === "High" ? "bg-amber-500 text-white"
                        : "bg-slate-200 text-slate-700"
                      }`}>
                        {req.incident_type ? `${req.incident_type} — ` : ""}{req.urgency}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <ClockIcon className="w-5 h-5 text-slate-400" />
                    <span>{elapsedSince(req.created_at)}</span>
                    {req.sla_deadline && req.status !== "CLOSED" && (
                      <span className="text-[11px] text-slate-400">
                        · SLA due {new Date(req.sla_deadline).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <UserIcon className="w-5 h-5 text-slate-400" />
                    <span>{req.reviewer || req.submitted_by}</span>
                  </div>

                  <span className={`px-4 py-1 rounded-full text-xs font-bold border ${TEAM_STYLES[req.category] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    {req.category || "Unclassified"}
                  </span>
                </div>
              </div>

              {(req.triage_footprint?.length > 0 || req.nudges?.length > 0) && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  {req.triage_footprint?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Active Triage Footprint</p>
                      <div className="space-y-1">
                        {req.triage_footprint.map((entry, idx) => (
                          <p key={idx} className="text-xs text-slate-600">
                            <span className="font-mono text-slate-400">
                              [{new Date(entry.timestamp).toISOString().slice(11, 16)} UTC]
                            </span>{" "}
                            <span className="font-semibold">{entry.actor}</span> {entry.action}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  {req.nudges?.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Nudges Sent</p>
                      <div className="space-y-1">
                        {req.nudges.map((nudge, idx) => (
                          <p key={idx} className="text-xs text-slate-500">
                            🔔 {nudge.message} — {nudge.by}, {new Date(nudge.timestamp).toLocaleString()}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col items-center gap-3">
                <button
                  onClick={() => handleViewLifeDocument(req.ticket_id)}
                  className="flex items-center gap-1.5 text-slate-800 text-sm font-bold hover:text-blue-600 transition-colors"
                >
                  <ChevronDownIcon className={`w-4 h-4 text-slate-600 transition-transform ${expandedId === req.ticket_id ? "rotate-180" : ""}`} />
                  View Life Document
                </button>

                {expandedId === req.ticket_id && (
                  <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-left">
                    {lifeDocs[req.ticket_id] ? (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-700 leading-relaxed">{lifeDocs[req.ticket_id].resolution_text}</p>
                        <p className="text-xs text-slate-400">
                          Approved by {lifeDocs[req.ticket_id].reviewer} on {lifeDocs[req.ticket_id].approved_at}
                        </p>
                        {lifeDocs[req.ticket_id].mitre_tags?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {lifeDocs[req.ticket_id].mitre_tags.map((tag) => (
                              <span key={tag} className="px-2.5 py-1 bg-purple-50 border border-purple-100 text-purple-700 rounded-md text-xs font-semibold">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">
                        {lifeDocErrors[req.ticket_id] || "Loading..."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}                 
        </div>
      </main>
    </div>
  );
}