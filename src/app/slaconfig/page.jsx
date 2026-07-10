"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Bars3Icon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import Sidebar from '../components/Sidebar';
import HeaderTabs from '../components/HeaderTabs';
import { authFetch, useAuthGuard, ROLE_LABELS } from '../../lib/auth';

const URGENCIES = ["Critical", "High", "Medium", "Low"];

export default function SLAConfigPage() {
  const { user, checked } = useAuthGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [config, setConfig] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [configRes, usersRes] = await Promise.all([
        authFetch("/api/v1/sla-config"),
        authFetch("/api/v1/users"),
      ]);
      const configData = await configRes.json();
      const usersData = await usersRes.json();
      if (!configRes.ok) throw new Error(configData.error || "Failed to load SLA config.");
      setConfig(configData.sla_config);
      if (usersRes.ok) setUsers(usersData.users || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (checked) fetchAll();
  }, [checked, fetchAll]);

  const updateHours = async (staffType, urgency, hours) => {
    setSaving(`${staffType}-${urgency}`);
    try {
      const response = await authFetch("/api/v1/sla-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_type: staffType, urgency, hours: parseFloat(hours) }),
      });
      const data = await response.json();
      if (response.ok) setConfig(data.sla_config);
    } finally {
      setSaving(null);
    }
  };

  const toggleInternal = async (targetUser) => {
    const response = await authFetch(`/api/v1/users/${targetUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_internal: !targetUser.is_internal }),
    });
    const data = await response.json();
    if (response.ok) {
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? data.user : u)));
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
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <AdjustmentsHorizontalIcon className="w-7 h-7 text-blue-600" /> SLA Configuration
          </h1>
          <p className="text-slate-500 text-lg mt-1">Pre-define SLA time limits per urgency for internal and external staff</p>
        </div>

        {error && <p className="text-red-600 font-semibold mb-4">{error}</p>}

        {config && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {["internal", "external"].map((staffType) => (
              <div key={staffType} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-slate-900 text-lg mb-4 capitalize">{staffType} Staff</h3>
                <div className="space-y-3">
                  {URGENCIES.map((urgency) => (
                    <div key={urgency} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{urgency}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          defaultValue={config[staffType]?.[urgency]}
                          onBlur={(e) => e.target.value && updateHours(staffType, urgency, e.target.value)}
                          className="w-20 px-2 py-1 border border-slate-200 rounded-md text-sm text-right"
                        />
                        <span className="text-xs text-slate-400">hrs</span>
                        {saving === `${staffType}-${urgency}` && <span className="text-xs text-blue-500">saving…</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 text-lg mb-4">Staff Directory — Internal / External</h3>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{u.name}</p>
                  <p className="text-xs text-slate-400">{ROLE_LABELS[u.role] || u.role} — {u.email}</p>
                </div>
                <button
                  onClick={() => toggleInternal(u)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                    u.is_internal
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-300"
                  }`}
                >
                  {u.is_internal ? "Internal" : "External"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
