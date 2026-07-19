"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Bars3Icon, ArrowRightIcon, MicrophoneIcon } from '@heroicons/react/24/outline';
import Sidebar from '../components/Sidebar';
import HeaderTabs from '../components/HeaderTabs';
import { authFetch, useAuthGuard } from '../../lib/auth';
import { useSpeechToText } from '../../lib/speech';
import { formatUtcPlus1 } from '../../lib/time';

/**
 * Live countdown to the budget's expiry date. Ticks every second while the
 * budget is active; shows an "expired" state once the date has passed.
 */
function BudgetCountdown({ expiryDate }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Count down to the end of the expiry day (23:59:59 local).
  const target = new Date(`${expiryDate}T23:59:59`).getTime();
  const diff = target - now;

  if (diff <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wide">
        Budget period expired
      </span>
    );
  }

  const cells = [
    { value: Math.floor(diff / 86400000), label: "Days" },
    { value: Math.floor((diff % 86400000) / 3600000), label: "Hrs" },
    { value: Math.floor((diff % 3600000) / 60000), label: "Min" },
    { value: Math.floor((diff % 60000) / 1000), label: "Sec" },
  ];

  return (
    <div className="flex items-center gap-1.5">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="flex flex-col items-center bg-white border border-emerald-200 rounded-lg px-2.5 py-1.5 min-w-[48px]"
        >
          <span className="text-lg font-black text-emerald-900 leading-none tabular-nums">
            {String(cell.value).padStart(2, "0")}
          </span>
          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide mt-0.5">{cell.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ServiceDeskDashboard() {
  const { user, checked } = useAuthGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiCensoring, setAiCensoring] = useState(true);
  const [autoApproval, setAutoApproval] = useState(false);
  const [censorIP, setCensorIP] = useState(true);
  const [maskKeys, setMaskKeys] = useState(true);
  const [hideNames, setHideNames] = useState(false);

  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const feedbackSpeech = useSpeechToText((transcript) =>
    setFeedbackText((prev) => (prev ? `${prev} ${transcript}` : transcript))
  );
  const [nudgedItems, setNudgedItems] = useState({});

  const [vendorData, setVendorData] = useState(null);
  const [vendorError, setVendorError] = useState(null);
  const [vendorDrafts, setVendorDrafts] = useState({});
  const [isDraftingEmail, setIsDraftingEmail] = useState(null);

  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ total: "", spent: "", expiry_date: "" });
  const [isSavingBudget, setIsSavingBudget] = useState(false);
  const [budgetError, setBudgetError] = useState(null);

  const [openTickets, setOpenTickets] = useState([]);
  const [ticketsError, setTicketsError] = useState(null);

  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({ category: "License Tracking", description: "", amount: "" });
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [itemError, setItemError] = useState(null);

  const [showLicenseForm, setShowLicenseForm] = useState(false);
  const [licenseForm, setLicenseForm] = useState({ name: "", vendor_name: "", expiry_date: "", annual_cost: "" });
  const [isSavingLicense, setIsSavingLicense] = useState(false);
  const [licenseError, setLicenseError] = useState(null);

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showTeamHistory, setShowTeamHistory] = useState(false);
  const [teamHistory, setTeamHistory] = useState([]);
  const [teamHistoryError, setTeamHistoryError] = useState(null);
  const [isLoadingTeamHistory, setIsLoadingTeamHistory] = useState(false);

  const fetchVendors = useCallback(async () => {
    try {
      const response = await authFetch("/api/v1/vendors");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load vendor & budget data.");
      }
      setVendorData(data);
      setVendorError(null);
    } catch (err) {
      setVendorError(err.message);
    }
  }, []);

  const fetchOpenTickets = useCallback(async () => {
    try {
      const response = await authFetch("/api/v1/tickets");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load active operations.");
      }
      const active = (data.tickets || [])
        .filter((t) => t.status !== "CLOSED")
        .reverse()
        .slice(0, 3);
      setOpenTickets(active);
      setTicketsError(null);
    } catch (err) {
      setTicketsError(err.message);
    }
  }, []);

  useEffect(() => {
    // fetchVendors/fetchOpenTickets only set state after their internal `await` resolves;
    // these are standard data-fetch-on-mount effects, not synchronous setState calls.
    if (checked) {
      fetchVendors();
      fetchOpenTickets();
    }
  }, [checked, fetchVendors, fetchOpenTickets]);

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    setFeedbackSent(true);
    setFeedbackText("");
    setTimeout(() => setFeedbackSent(false), 3000);
  };

  const openBudgetForm = () => {
    const b = vendorData?.budget;
    setBudgetForm({
      total: b?.total ? String(b.total) : "",
      spent: b?.spent ? String(b.spent) : "",
      expiry_date: b?.expiry_date || "",
    });
    setBudgetError(null);
    setShowBudgetForm(true);
  };

  const saveBudget = async (active) => {
    if (!budgetForm.total || !budgetForm.spent || !budgetForm.expiry_date) {
      setBudgetError("Total, spent, and expiry date are all required.");
      return;
    }
    setIsSavingBudget(true);
    setBudgetError(null);
    try {
      const response = await authFetch("/api/v1/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total: parseFloat(budgetForm.total),
          spent: parseFloat(budgetForm.spent),
          expiry_date: budgetForm.expiry_date,
          active,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save budget.");
      }
      setVendorData((prev) => ({ ...(prev || {}), budget: data.budget }));
      setShowBudgetForm(false);
      // Adding/editing the budget can change which licenses are affordable/active,
      // so refresh the full vendor list to keep the License Cards in sync.
      fetchVendors();
    } catch (err) {
      setBudgetError(err.message);
    } finally {
      setIsSavingBudget(false);
    }
  };

  const renewBudget = async () => {
    setIsSavingBudget(true);
    setBudgetError(null);
    try {
      const response = await authFetch("/api/v1/budget/renew", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to renew budget.");
      }
      setVendorData((prev) => ({ ...(prev || {}), budget: data.budget }));
    } catch (err) {
      setBudgetError(err.message);
    } finally {
      setIsSavingBudget(false);
    }
  };

  const toggleBudgetActive = async () => {
    const b = vendorData?.budget;
    if (!b?.expiry_date) {
      openBudgetForm();
      return;
    }
    setIsSavingBudget(true);
    try {
      const response = await authFetch("/api/v1/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !b.active }),
      });
      const data = await response.json();
      if (response.ok) {
        setVendorData((prev) => ({ ...(prev || {}), budget: data.budget }));
      }
    } catch {
      // Non-critical; the toggle simply won't flip.
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleNudge = async (ticketId) => {
    setNudgedItems((prev) => ({ ...prev, [ticketId]: true }));
    try {
      const response = await authFetch(`/api/v1/tickets/${ticketId}/nudge`, { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        setOpenTickets((prev) => prev.map((t) => (t.ticket_id === ticketId ? data.ticket : t)));
      }
    } catch {
      // Nudge is non-critical; the toggled "sent" state below already gives feedback.
    }
    setTimeout(() => setNudgedItems((prev) => ({ ...prev, [ticketId]: false })), 3000);
  };

  const handleDraftVendorEmail = async (vendorId) => {
    if (vendorDrafts[vendorId]) {
      setVendorDrafts((prev) => {
        const next = { ...prev };
        delete next[vendorId];
        return next;
      });
      return;
    }

    setIsDraftingEmail(vendorId);
    try {
      const response = await authFetch(`/api/v1/vendors/${vendorId}/draft-email`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to draft vendor email.");
      }
      setVendorDrafts((prev) => ({ ...prev, [vendorId]: data.draft }));
    } catch (err) {
      setVendorDrafts((prev) => ({ ...prev, [vendorId]: { subject: "Error", body: err.message } }));
    } finally {
      setIsDraftingEmail(null);
    }
  };

  const saveBudgetItem = async () => {
    if (!itemForm.category || !itemForm.amount) {
      setItemError("Category and amount are required.");
      return;
    }
    setIsSavingItem(true);
    setItemError(null);
    try {
      const response = await authFetch("/api/v1/budget/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: itemForm.category,
          description: itemForm.description,
          amount: parseFloat(itemForm.amount),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add budget item.");
      setVendorData((prev) => ({ ...(prev || {}), budget: data.budget }));
      setItemForm({ category: "License Tracking", description: "", amount: "" });
      setShowItemForm(false);
    } catch (err) {
      setItemError(err.message);
    } finally {
      setIsSavingItem(false);
    }
  };

  const saveLicense = async () => {
    if (!licenseForm.name || !licenseForm.vendor_name || !licenseForm.expiry_date || !licenseForm.annual_cost) {
      setLicenseError("All license fields are required.");
      return;
    }
    setIsSavingLicense(true);
    setLicenseError(null);
    try {
      const response = await authFetch("/api/v1/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: licenseForm.name,
          vendor_name: licenseForm.vendor_name,
          expiry_date: licenseForm.expiry_date,
          annual_cost: parseFloat(licenseForm.annual_cost),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add license.");
      setVendorData((prev) => ({
        ...(prev || {}),
        budget: data.budget,
        vendors: [...(prev?.vendors || []), data.vendor],
      }));
      setLicenseForm({ name: "", vendor_name: "", expiry_date: "", annual_cost: "" });
      setShowLicenseForm(false);
    } catch (err) {
      setLicenseError(err.message);
    } finally {
      setIsSavingLicense(false);
    }
  };

  const handleToggleTeamHistory = async () => {
    setShowTeamHistory((prev) => !prev);
    if (teamHistory.length > 0 || teamHistoryError) return;

    setIsLoadingTeamHistory(true);
    try {
      const response = await authFetch("/api/v1/life-doc");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load team history.");
      }
      setTeamHistory(data.life_documents || []);
    } catch (err) {
      setTeamHistoryError(err.message);
    } finally {
      setIsLoadingTeamHistory(false);
    }
  };

  if (!checked) return null;

  return (
    <div className="h-screen w-screen bg-slate-50 font-sans flex flex-col antialiased overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* GLOBAL NAVBAR HEADER */}
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between flex-shrink-0 z-40">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="p-2 rounded-lg hover:bg-slate-100 transition active:scale-95"
          >
            <Bars3Icon className="w-6 h-6 text-slate-700" />
          </button>
        </div>

        <HeaderTabs />

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-slate-700 hidden sm:inline">{user.name}</span>
        </div>
      </header>

      {/* DASHBOARD CONTENT ENGINE */}
      <main className="flex-1 p-6 overflow-y-auto w-full max-w-[1600px] mx-auto custom-scrollbar">
        
        {/* Dynamic Interface Header Titles */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight">Service Desk Officers Interface</h1>
          <p className="text-slate-400 text-sm mt-0.5">System administration and oversight control center</p>
        </div>

        {/* TOP ROW GRID BLOCK */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mb-6">
          
          {/* Left Block: Global Operations Grid (Spans 2 columns) */}
          <div className="lg:col-span-2 border border-slate-200 bg-white rounded-2xl p-6 shadow-2xs space-y-5">
            <div>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-[15px]">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.5V4.5M9 4.5v15M3 12h18" />
                </svg>
                <span>Global Operations Grid</span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">Live open tickets pulled from the triage queue</p>
            </div>

            {ticketsError && (
              <p className="text-red-600 text-xs font-semibold">{ticketsError}</p>
            )}
            {!ticketsError && openTickets.length === 0 && (
              <p className="text-slate-400 text-sm font-medium">
                No active operations. Submit a request from the AI Chat page to populate this grid.
              </p>
            )}

            {openTickets.map((ticket) => (
              <div key={ticket.ticket_id} className="border border-slate-100 rounded-xl p-5 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-[15px]">
                    {ticket.clean_text?.slice(0, 60)}{ticket.clean_text?.length > 60 ? "…" : ""}
                  </h4>
                  {ticket.urgency && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase border ${
                      ticket.urgency === "Critical" ? "text-red-700 bg-red-50 border-red-100"
                      : ticket.urgency === "High" ? "text-amber-700 bg-amber-50 border-amber-100"
                      : "text-slate-600 bg-slate-50 border-slate-100"
                    }`}>
                      {ticket.incident_type ? `${ticket.incident_type} • ` : ""}{ticket.urgency}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> {ticket.submitted_by}
                  </span>
                  <span className="px-2 py-0.5 rounded font-bold bg-slate-50 text-slate-600">
                    {ticket.ticket_id} • {ticket.category || "Unclassified"}
                  </span>
                </div>
                {ticket.needs_human_review && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 font-medium">
                    ⚠️ <span className="font-bold">Flagged for review:</span> AI confidence was only {Math.round((ticket.confidence || 0) * 100)}%
                  </div>
                )}
                {ticket.nudges?.length > 0 && (
                  <div className="space-y-1">
                    {ticket.nudges.map((nudge, idx) => (
                      <p key={idx} className="text-[11px] text-slate-400">
                        🔔 {nudge.message} — {nudge.by}, {formatUtcPlus1(nudge.timestamp)}
                      </p>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => handleNudge(ticket.ticket_id)}
                  className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  {nudgedItems[ticket.ticket_id] ? "✅ Nudge Sent" : "🔔 Nudge Team Member"}
                </button>
              </div>
            ))}
          </div>

          {/* Right Block: Sidebar System Controls & Budget Tracker */}
          <div className="space-y-6">
            {/* System Settings Node */}
            <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-2xs space-y-5">
              <div>
                <div className="flex items-center gap-2 text-slate-800 font-bold text-[15px]">
                  ⚙️ <span>System Controls</span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">Global AI and system settings</p>
              </div>

              {/* Toggle 1 */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <h5 className="text-xs font-bold text-slate-800">AI Censoring</h5>
                  <p className="text-[11px] text-slate-400">Auto-redact sensitive data</p>
                </div>
                <button 
                  onClick={() => setAiCensoring(!aiCensoring)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${aiCensoring ? 'bg-slate-900' : 'bg-slate-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${aiCensoring ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Toggle 2 */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Auto-Approval</h5>
                  <p className="text-[11px] text-slate-400">Auto-approve low-risk changes</p>
                </div>
                <button 
                  onClick={() => setAutoApproval(!autoApproval)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${autoApproval ? 'bg-slate-900' : 'bg-slate-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${autoApproval ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <button
                onClick={() => setShowAdvancedSettings((prev) => !prev)}
                className="w-full py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition shadow-3xs"
              >
                {showAdvancedSettings ? "Hide Advanced Settings" : "Advanced Settings"}
              </button>
              {showAdvancedSettings && (
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-[11px] text-slate-600 space-y-1">
                  <p>AI Censoring: <span className="font-bold">{aiCensoring ? "Enabled" : "Disabled"}</span></p>
                  <p>Auto-Approval: <span className="font-bold">{autoApproval ? "Enabled" : "Disabled"}</span></p>
                  <p className="text-slate-400 pt-1">These controls are session-local for this demo and are not yet persisted server-side.</p>
                </div>
              )}
            </div>

            {/* Budget & Tracker Node */}
            <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-[15px]">
                  💰 <span>Budget & License Tracking</span>
                </div>
                {vendorData && !showBudgetForm && (
                  <button
                    onClick={openBudgetForm}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    {vendorData.budget.expiry_date ? "Edit" : "Set Budget"}
                  </button>
                )}
              </div>
              {vendorError && (
                <p className="text-red-600 text-xs font-semibold">{vendorError}</p>
              )}

              {/* Set / Edit Budget Form */}
              {showBudgetForm && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Total Budget ($)</label>
                    <input
                      type="number"
                      value={budgetForm.total}
                      onChange={(e) => setBudgetForm((p) => ({ ...p, total: e.target.value }))}
                      placeholder="200000"
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Amount Spent ($)</label>
                    <input
                      type="number"
                      value={budgetForm.spent}
                      onChange={(e) => setBudgetForm((p) => ({ ...p, spent: e.target.value }))}
                      placeholder="124500"
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Budget Expiry Date</label>
                    <input
                      type="date"
                      value={budgetForm.expiry_date}
                      onChange={(e) => setBudgetForm((p) => ({ ...p, expiry_date: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {budgetError && <p className="text-red-600 text-xs font-semibold">{budgetError}</p>}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => saveBudget(true)}
                      disabled={isSavingBudget}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                    >
                      {isSavingBudget ? "Saving..." : "Set & Activate"}
                    </button>
                    <button
                      onClick={() => setShowBudgetForm(false)}
                      className="px-3 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Budget Display */}
              {vendorData && !showBudgetForm && (
                <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-700 tracking-wide uppercase">Security Budget</span>
                    <button
                      onClick={toggleBudgetActive}
                      disabled={isSavingBudget}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase transition ${
                        vendorData.budget.active
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-500 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {vendorData.budget.active ? "● Active" : "○ Inactive"}
                    </button>
                  </div>
                  <div className="text-[28px] font-black text-emerald-900 leading-none">
                    ${vendorData.budget.spent.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-emerald-700/80 font-medium block">
                    ${vendorData.budget.remaining.toLocaleString()} remaining from ${vendorData.budget.total.toLocaleString()}
                  </span>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-slate-900 h-full rounded-full" style={{ width: `${vendorData.budget.percent_used}%` }} />
                  </div>

                  {/* Live countdown to the budget expiry date */}
                  <div className="pt-2 mt-1 border-t border-emerald-100">
                    {!vendorData.budget.expiry_date ? (
                      <p className="text-[11px] text-slate-500 font-medium">
                        No expiry date set. Use “Set Budget” to start a countdown.
                      </p>
                    ) : !vendorData.budget.active ? (
                      <p className="text-[11px] text-amber-600 font-semibold">
                        Budget is inactive — activate it to run the countdown to {vendorData.budget.expiry_date}.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                            Time to budget expiry ({vendorData.budget.expiry_date})
                          </p>
                          <button
                            onClick={renewBudget}
                            disabled={isSavingBudget}
                            title="Reset the countdown to a fresh full term"
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                          >
                            {isSavingBudget ? "…" : "↻ Renew"}
                          </button>
                        </div>
                        <BudgetCountdown expiryDate={vendorData.budget.expiry_date} />
                      </div>
                    )}
                    {vendorData.budget.expiry_date && vendorData.budget.expired && (
                      <button
                        onClick={renewBudget}
                        disabled={isSavingBudget}
                        className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                      >
                        {isSavingBudget ? "Renewing..." : "↻ Renew Budget Period"}
                      </button>
                    )}
                  </div>

                  {/* Budget line items ledger */}
                  <div className="pt-2 mt-1 border-t border-emerald-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Budget Items</p>
                      <button
                        onClick={() => setShowItemForm((p) => !p)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700"
                      >
                        {showItemForm ? "Cancel" : "+ Add Item"}
                      </button>
                    </div>
                    {showItemForm && (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                        <select
                          value={itemForm.category}
                          onChange={(e) => setItemForm((p) => ({ ...p, category: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs"
                        >
                          <option>License Tracking</option>
                          <option>Food</option>
                          <option>Cybersecurity Awareness</option>
                          <option>Other</option>
                        </select>
                        <input
                          type="text"
                          value={itemForm.description}
                          onChange={(e) => setItemForm((p) => ({ ...p, description: e.target.value }))}
                          placeholder="Description"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs"
                        />
                        <input
                          type="number"
                          value={itemForm.amount}
                          onChange={(e) => setItemForm((p) => ({ ...p, amount: e.target.value }))}
                          placeholder="Amount ($)"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs"
                        />
                        {itemError && <p className="text-red-600 text-[11px] font-semibold">{itemError}</p>}
                        <button
                          onClick={saveBudgetItem}
                          disabled={isSavingItem}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-md disabled:opacity-50"
                        >
                          {isSavingItem ? "Saving..." : "Save Item"}
                        </button>
                      </div>
                    )}
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {(vendorData.budget.items || []).slice().reverse().map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-[11px] text-emerald-800">
                          <span>{item.category}{item.description ? ` — ${item.description}` : ""}</span>
                          <span className="font-bold">${item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM ROW GRID BLOCK */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Block: Messaging Console and Censorship Workbench (Spans 2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Feedback Console Widget */}
            <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-2xs space-y-4">
              <div>
                <div className="flex items-center justify-between text-slate-800 font-bold text-[15px]">
                  <span>💬 Feedback Console</span>
                  <button
                    onClick={feedbackSpeech.isListening ? feedbackSpeech.stopListening : feedbackSpeech.startListening}
                    disabled={!feedbackSpeech.isSupported}
                    title={feedbackSpeech.isSupported ? "Speak your message" : "Speech-to-text not supported in this browser"}
                    className={`p-1.5 rounded-md border transition ${
                      feedbackSpeech.isListening
                        ? "bg-red-500 border-red-500 text-white animate-pulse"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    } disabled:opacity-50`}
                  >
                    <MicrophoneIcon className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">Communicate directly with team members on pending cases</p>
              </div>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="w-full min-h-[100px] bg-slate-50/50 border border-slate-200 rounded-xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-400 resize-none"
                placeholder="Type your message to the team member..."
              />
              <button
                onClick={handleSendFeedback}
                disabled={!feedbackText.trim()}
                className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {feedbackSent ? "✅ Sent" : "Send Feedback"}
              </button>
            </div>

            {/* Global Audit Censorship Workbench Widget */}
            <div className="border border-purple-200 bg-purple-50/10 rounded-2xl p-6 shadow-2xs space-y-5">
              <div>
                <div className="flex items-center gap-2 text-purple-900 font-bold text-[15px]">
                  👁️ <span>Global Audit Censorship Workbench</span>
                </div>
                <p className="text-purple-600/80 text-xs mt-0.5">Control what information is visible in AI-generated audit reports</p>
              </div>

              {/* Toggle Row 1 */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Censor Internal IP Addresses</h5>
                  <p className="text-[11px] text-slate-400">Hide private IP ranges in reports</p>
                </div>
                <button 
                  onClick={() => setCensorIP(!censorIP)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${censorIP ? 'bg-slate-900' : 'bg-slate-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${censorIP ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Toggle Row 2 */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Mask API Keys & Secrets</h5>
                  <p className="text-[11px] text-slate-400">Redact sensitive credentials</p>
                </div>
                <button 
                  onClick={() => setMaskKeys(!maskKeys)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${maskKeys ? 'bg-slate-900' : 'bg-slate-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${maskKeys ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Toggle Row 3 */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Hide Employee Names</h5>
                  <p className="text-[11px] text-slate-400">Replace with role identifiers</p>
                </div>
                <button 
                  onClick={() => setHideNames(!hideNames)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${hideNames ? 'bg-slate-900' : 'bg-slate-200'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${hideNames ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Block: License Expirations Panel & History Node */}
          <div className="space-y-6">
            
            {/* License Notification Queue Layout */}
            <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-[15px]">
                  📅 <span>License Expirations</span>
                </div>
                <button
                  onClick={() => setShowLicenseForm((p) => !p)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  {showLicenseForm ? "Cancel" : "+ Add License"}
                </button>
              </div>

              {showLicenseForm && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <input
                    type="text"
                    value={licenseForm.name}
                    onChange={(e) => setLicenseForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="License name (e.g. EDR Solution)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400"
                  />
                  <input
                    type="text"
                    value={licenseForm.vendor_name}
                    onChange={(e) => setLicenseForm((p) => ({ ...p, vendor_name: e.target.value }))}
                    placeholder="Vendor name"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400"
                  />
                  <input
                    type="date"
                    value={licenseForm.expiry_date}
                    onChange={(e) => setLicenseForm((p) => ({ ...p, expiry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400"
                  />
                  <input
                    type="number"
                    value={licenseForm.annual_cost}
                    onChange={(e) => setLicenseForm((p) => ({ ...p, annual_cost: e.target.value }))}
                    placeholder="Annual cost ($)"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder-slate-400"
                  />
                  {licenseError && <p className="text-red-600 text-xs font-semibold">{licenseError}</p>}
                  <button
                    onClick={saveLicense}
                    disabled={isSavingLicense}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                  >
                    {isSavingLicense ? "Adding..." : "Add License (debits budget)"}
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {vendorError && (
                  <p className="text-red-600 text-xs font-semibold">{vendorError}</p>
                )}
                {!vendorData && !vendorError && (
                  <p className="text-slate-400 text-xs font-medium">Loading license data...</p>
                )}
                {vendorData?.vendors.map((vendor) => {
                  const urgent = vendor.renewal_warning;
                  const percent = Math.max(0, Math.min(100, 100 - (vendor.days_until_expiry / 180) * 100));
                  const draft = vendorDrafts[vendor.vendor_id];
                  return (
                    <div
                      key={vendor.vendor_id}
                      className={`border rounded-xl p-3 text-xs ${urgent ? "border-red-100 bg-red-50/30" : "border-slate-100 bg-white"}`}
                    >
                      <div className={`flex justify-between font-bold ${urgent ? "text-red-950" : "text-slate-800"}`}>
                        <span>{vendor.name}</span> {urgent && <span>⚠️</span>}
                      </div>
                      <div className={`font-semibold mt-1 ${urgent ? "text-red-700" : "text-slate-500"}`}>
                        Expires in <span className="font-bold">{vendor.days_until_expiry} days</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full rounded-full ${urgent ? "bg-red-600" : "bg-slate-900"}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <button
                        onClick={() => handleDraftVendorEmail(vendor.vendor_id)}
                        disabled={isDraftingEmail === vendor.vendor_id}
                        className="w-full mt-2 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-md transition disabled:opacity-50"
                      >
                        {isDraftingEmail === vendor.vendor_id ? "Drafting..." : draft ? "Hide Draft Email" : "Draft Vendor Email"}
                      </button>
                      {draft && (
                        <div className="mt-2 p-2 bg-slate-50 border border-slate-100 rounded-md whitespace-pre-wrap text-slate-600">
                          <p className="font-bold text-slate-800 mb-1">{draft.subject}</p>
                          {draft.body}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team History Link Node */}
            <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-[14px]">
                👥 <span>Team History</span>
              </div>
              <button
                onClick={handleToggleTeamHistory}
                className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition shadow-3xs flex items-center justify-center gap-1.5"
              >
                {showTeamHistory ? "Hide" : "View All"} Team Members History <ArrowRightIcon className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showTeamHistory ? "rotate-90" : ""}`} />
              </button>
              {showTeamHistory && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {isLoadingTeamHistory && (
                    <p className="text-xs text-slate-400 font-medium">Loading...</p>
                  )}
                  {teamHistoryError && (
                    <p className="text-xs text-red-600 font-semibold">{teamHistoryError}</p>
                  )}
                  {!isLoadingTeamHistory && !teamHistoryError && teamHistory.length === 0 && (
                    <p className="text-xs text-slate-400 font-medium">No resolved tickets yet.</p>
                  )}
                  {teamHistory.map((doc) => (
                    <div key={doc.id} className="border border-slate-100 rounded-lg p-3 text-xs bg-slate-50/50">
                      <p className="font-bold text-slate-800">{doc.reviewer}</p>
                      <p className="text-slate-500 mt-0.5">{doc.resolution_text}</p>
                      <p className="text-slate-400 mt-1">{doc.ticket_id} • {formatUtcPlus1(doc.approved_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
