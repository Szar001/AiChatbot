"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Bars3Icon, ChartBarIcon } from '@heroicons/react/24/outline';
import Sidebar from '../components/Sidebar';
import HeaderTabs from '../components/HeaderTabs';
import { authFetch, useAuthGuard } from '../../lib/auth';

export default function SecurityPosturePage() {
  const { user, checked } = useAuthGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [posture, setPosture] = useState(null);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);

  const fetchPosture = useCallback(async () => {
    try {
      const response = await authFetch("/api/v1/security-posture");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load security posture.");
      setPosture(data.posture);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (checked) fetchPosture();
  }, [checked, fetchPosture]);

  const compileReport = async () => {
    setIsCompiling(true);
    try {
      const response = await authFetch("/api/v1/compliance-report");
      const data = await response.json();
      if (response.ok) setReport(data);
    } finally {
      setIsCompiling(false);
    }
  };

  if (!checked) return null;

  return (
    <div className="h-screen w-screen bg-slate-50 font-sans flex flex-col antialiased overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between flex-shrink-0 z-40">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 transition active:scale-95">
          <Bars3Icon className="w-6 h-6 text-slate-700" />
        </button>
        <HeaderTabs />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-slate-700 hidden sm:inline">{user.name}</span>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-y-auto w-full max-w-[1200px] mx-auto custom-scrollbar">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-[32px] font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <ChartBarIcon className="w-7 h-7 text-blue-600" /> Security Posture Scoreboard
            </h1>
            <p className="text-slate-500 text-lg mt-1">Rolled-up view of open risk, SLA health, and playbook status</p>
          </div>
          <button
            onClick={compileReport}
            disabled={isCompiling}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg disabled:opacity-50"
          >
            {isCompiling ? "Compiling..." : "Compile Compliance Report"}
          </button>
        </div>

        {error && <p className="text-red-600 font-semibold">{error}</p>}
        {!posture && !error && <p className="text-slate-400 font-medium">Loading posture data...</p>}

        {posture && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wide">Open Tickets</p>
              <p className="text-4xl font-black text-slate-900 mt-2">{posture.open_tickets_total}</p>
              <div className="mt-3 space-y-1">
                {Object.entries(posture.open_tickets_by_urgency).map(([urgency, count]) => (
                  <div key={urgency} className="flex justify-between text-xs text-slate-600">
                    <span>{urgency}</span><span className="font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wide">SLA Breach Rate</p>
              <p className="text-4xl font-black text-slate-900 mt-2">{posture.sla_breach_rate_pct}%</p>
              <p className="text-xs text-slate-500 mt-2">Vendor SLA breaches: {posture.vendor_sla_breaches}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wide">Exploit Playbook</p>
              <p className="text-4xl font-black text-slate-900 mt-2">
                {posture.exploit_playbook.patched}/{posture.exploit_playbook.total}
              </p>
              <p className="text-xs text-slate-500 mt-2">Patched vs. {posture.exploit_playbook.active} still Active</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm md:col-span-3">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-3">Compliance Telemetry</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-black text-slate-900">{posture.telemetry.redactions}</p>
                  <p className="text-xs text-slate-500">PII Redactions</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{posture.telemetry.access_checks}</p>
                  <p className="text-xs text-slate-500">Access Checks</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">{posture.telemetry.boundary_checks}</p>
                  <p className="text-xs text-slate-500">Boundary Checks</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {report && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-3">Compliance Report</h3>
            <p className="text-xs text-slate-500 mb-2">{report.audit_events_reviewed} audit events reviewed</p>
            <div className="space-y-1 text-sm">
              {Object.entries(report.audit_action_counts).map(([action, count]) => (
                <div key={action} className="flex justify-between text-slate-700">
                  <span>{action}</span><span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
