"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { ClockIcon, UserIcon, ChevronDownIcon, Bars3Icon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';
import Sidebar from "../components/Sidebar"
import HeaderTabs from "../components/HeaderTabs"
import { authFetch, useAuthGuard } from "../../lib/auth"
import { elapsedSince, formatUtcPlus1, formatSlaStatus } from "../../lib/time"

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

const BOARD_COLUMNS = [
  { key: 'PENDING_REVIEW', label: 'Pending Review' },
  { key: 'ONGOING', label: 'Ongoing' },
  { key: 'ESCALATED', label: 'Escalated' },
  { key: 'CLOSED', label: 'Closed' },
];

const CAN_DELETE_ROLES = ['ciso', 'service_desk_officer'];

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

  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const canDelete = CAN_DELETE_ROLES.includes(user?.role);

  const handleDeleteTicket = async (ticketId) => {
    setDeletingId(ticketId);
    try {
      const response = await authFetch(`/api/v1/tickets/${ticketId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete request.");
      }
      setRequestsData((prev) => prev.filter((r) => r.ticket_id !== ticketId));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
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

        {/* Requests Kanban Board — fixed-width columns, no auto-resizing */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((col) => {
            const items = filteredData.filter((req) => {
              if (col.key === "ESCALATED") return !!req.needs_human_review;
              if (req.needs_human_review) return false;
              return req.status === col.key;
            });

            return (
              <div key={col.key} className="w-80 flex-shrink-0 flex flex-col">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-sm font-bold text-slate-700">{col.label}</h3>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-4">
                  {items.length === 0 && (
                    <p className="text-slate-400 text-xs font-medium px-1">No requests in this column.</p>
                  )}
                  {items.map((req) => {
                    const slaStatus = req.status !== "CLOSED" ? formatSlaStatus(req.created_at, req.sla_deadline) : null;
                    return (
                      <div key={req.ticket_id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-400 tracking-wider">{req.ticket_id}</span>
                          {canDelete && (
                            <button
                              onClick={() => setConfirmDeleteId(req.ticket_id)}
                              className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                              aria-label="Delete request"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug mt-1">
                          {req.clean_text?.slice(0, 90)}{req.clean_text?.length > 90 ? "…" : ""}
                        </h3>

                        <div className="flex flex-wrap items-center gap-1.5 mt-3">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${STATUS_STYLES[req.status] || 'bg-slate-400 text-white'}`}>
                            {req.status?.replace("_", " ")}
                          </span>
                          {req.urgency && (
                            <span className={`px-2 py-1 text-[10px] font-bold rounded-md tracking-wide whitespace-nowrap ${
                              req.urgency === "Critical" ? "bg-red-600 text-white"
                              : req.urgency === "High" ? "bg-amber-500 text-white"
                              : "bg-slate-200 text-slate-700"
                            }`}>
                              {req.incident_type ? `${req.incident_type} — ` : ""}{req.urgency}
                            </span>
                          )}
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${TEAM_STYLES[req.category] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                            {req.category || "Unclassified"}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <ClockIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>Time spent {elapsedSince(req.created_at)}</span>
                          </div>
                          {req.sla_deadline && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <span>Due {formatUtcPlus1(req.sla_deadline)}</span>
                            </div>
                          )}
                          {slaStatus && (
                            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              slaStatus.breached ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            }`}>
                              {slaStatus.label}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>{req.reviewer || req.submitted_by}</span>
                          </div>
                        </div>

                        {(req.triage_footprint?.length > 0 || req.nudges?.length > 0) && (
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                            {req.triage_footprint?.length > 0 && (
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Active Triage Footprint</p>
                                <div className="space-y-1">
                                  {req.triage_footprint.map((entry, idx) => (
                                    <p key={idx} className="text-[11px] text-slate-600">
                                      <span className="font-mono text-slate-400">[{formatUtcPlus1(entry.timestamp)}]</span>{" "}
                                      <span className="font-semibold">{entry.actor}</span> {entry.action}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            {req.nudges?.length > 0 && (
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Nudges Sent</p>
                                <div className="space-y-1">
                                  {req.nudges.map((nudge, idx) => (
                                    <p key={idx} className="text-[11px] text-slate-500">
                                      🔔 {nudge.message} — {nudge.by}, {formatUtcPlus1(nudge.timestamp)}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col items-center gap-2">
                          <button
                            onClick={() => handleViewLifeDocument(req.ticket_id)}
                            className="flex items-center gap-1.5 text-slate-800 text-xs font-bold hover:text-blue-600 transition-colors"
                          >
                            <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-600 transition-transform ${expandedId === req.ticket_id ? "rotate-180" : ""}`} />
                            View Life Document
                          </button>

                          {expandedId === req.ticket_id && (
                            <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-left">
                              {lifeDocs[req.ticket_id] ? (
                                <div className="space-y-2">
                                  <p className="text-xs text-slate-700 leading-relaxed">{lifeDocs[req.ticket_id].resolution_text}</p>
                                  <p className="text-[11px] text-slate-400">
                                    Approved by {lifeDocs[req.ticket_id].reviewer} on {lifeDocs[req.ticket_id].approved_at}
                                  </p>
                                  {lifeDocs[req.ticket_id].mitre_tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {lifeDocs[req.ticket_id].mitre_tags.map((tag) => (
                                        <span key={tag} className="px-2 py-0.5 bg-purple-50 border border-purple-100 text-purple-700 rounded-md text-[11px] font-semibold">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400">
                                  {lifeDocErrors[req.ticket_id] || "Loading..."}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {confirmDeleteId === req.ticket_id && (
                          <div className="mt-3 pt-3 border-t border-slate-100 bg-red-50 rounded-xl p-3 space-y-2">
                            <p className="text-xs text-red-700 font-semibold">Delete this request? This is a soft delete and can be audited.</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDeleteTicket(req.ticket_id)}
                                disabled={deletingId === req.ticket_id}
                                className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                              >
                                {deletingId === req.ticket_id ? "Deleting..." : "Confirm Delete"}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}