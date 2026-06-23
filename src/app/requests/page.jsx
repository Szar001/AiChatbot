"use client"

import React, { useState } from 'react';
import { ClockIcon, UserIcon, ChevronDownIcon, Bars3Icon } from '@heroicons/react/24/outline';
import Sidebar from "../components/Sidebar"

export default function RequestsPage() {
  const [filter, setFilter] = useState('All Requests');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const requestsData = [
    {
      id: 'REQ-2024-001',
      title: 'Suspicious Login Attempts from Unknown IP',
      status: 'ONGOING',
      time: '02h 14m',
      owner: 'Sarah Chen',
      team: 'Attack Security',
      styles: {
        statusBg: 'bg-[#3b82f6] text-white',
        teamBg: 'bg-[#fef2f2] text-[#b91c1c] border-[#fee2e2]',
      }
    },
    {
      id: 'REQ-2024-002',
      title: 'ISO 27001 Gap Assessment Q2 2026',
      status: 'PENDING',
      subStatus: 'Escalated to Humans',
      time: '16h 42m',
      owner: 'Michael Torres',
      team: 'Governance',
      styles: {
        statusBg: 'bg-[#f59e0b] text-white',
        teamBg: 'bg-[#f3e8ff] text-[#6b21a8] border-[#e9d5ff]',
      }
    },
    {
      id: 'REQ-2024-003',
      title: 'Phishing Email Campaign Detected',
      status: 'ONGOING',
      time: '01h 05m',
      owner: 'Emma Wilson',
      team: 'Defence Defenders',
      styles: {
        statusBg: 'bg-[#3b82f6] text-white',
        teamBg: 'bg-[#eff6ff] text-[#1d4ed8] border-[#dbeafe]',
      }
    }
  ];

  // Optional: Filter logic to make your buttons actually filter data
  const filteredData = requestsData.filter(req => {
    if (filter === 'All Requests') return true;
    return req.status.toLowerCase() === filter.toLowerCase() || 
           (filter === 'Escalated' && req.subStatus);
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col antialiased">
      {/* Re-inject persistent sidebar layout sync */}
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      {/* PERSISTENT NAV BAR FRAME */}
      <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 transition">
          <Bars3Icon className="w-7 h-7 text-slate-700" />
        </button>

        <div className="bg-slate-100 p-1 rounded-full flex items-center shadow-inner">
          <span className="px-5 py-1.5 text-slate-600 font-medium text-sm rounded-full">AI Chat Bot</span>
          <span className="px-5 py-1.5 text-slate-600 font-medium text-sm rounded-full">GRC Co-Pilot</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">LT</div>
        </div>
      </header>

      {/* CORE REQUESTS CONTENT CONTENT */}
      <main className="w-full space-y-6 max-w-7xl mx-auto p-6 flex-1">
        <div>
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight">Requests Management</h1>
          <p className="text-slate-500 text-[15px] mt-1">Monitor and track all security requests and incidents</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
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
        </div>

        {/* Requests Dynamic Cards */}
        <div className="space-y-4">
          {filteredData.map((req) => (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 tracking-wider block">{req.id}</span>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">{req.title}</h3>
                </div>
                
                <div className="flex flex-wrap items-center gap-6 lg:gap-12 text-[14px]">
                  <div className="flex flex-col gap-1 min-w-[100px]">
                    <span className={`px-3 py-1 rounded-md text-center text-[11px] font-bold tracking-wider ${req.styles.statusBg}`}>
                      {req.status}
                    </span>
                    {req.subStatus && (
                      <span className="px-2 py-1 bg-[#f97316] text-white text-[10px] font-bold rounded-md tracking-wide text-center whitespace-nowrap">
                        {req.subStatus}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <ClockIcon className="w-5 h-5 text-slate-400" />
                    <span>{req.time}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <UserIcon className="w-5 h-5 text-slate-400" />
                    <span>{req.owner}</span>
                  </div>

                  <span className={`px-4 py-1 rounded-full text-xs font-bold border ${req.styles.teamBg}`}>
                    {req.team}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex justify-center">
                <button className="flex items-center gap-1.5 text-slate-800 text-sm font-bold hover:text-blue-600 transition-colors">
                  <ChevronDownIcon className="w-4 h-4 text-slate-600" /> View Life Document
                </button>
              </div>
            </div>
          ))}                 
        </div>
      </main>
    </div>
  );
}