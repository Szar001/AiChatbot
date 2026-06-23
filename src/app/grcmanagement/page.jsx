"use client";

import React, { useState } from 'react';
import { 
  Bars3Icon, 
  ArrowUpTrayIcon, 
  DocumentIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import Sidebar from '../components/Sidebar';

export default function GRCManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const recentlyUploaded = [
    {
      name: "ISO 27001 Policy Framework.pdf",
      type: "Security Policy",
      date: "2026-05-15",
      status: "Processed",
      statusColor: "text-emerald-600 bg-emerald-50 border-emerald-100"
    },
    {
      name: "GDPR Compliance Guidelines.pdf",
      type: "Compliance Policy",
      date: "2026-05-18",
      status: "Processing",
      statusColor: "text-amber-600 bg-amber-50 border-amber-100"
    }
  ];

  const scoreboard = [
    { name: "ISO 27001", controls: "142/163", score: 87, status: "Compliant", color: "bg-emerald-500" },
    { name: "GDPR", controls: "78/85", score: 92, status: "Compliant", color: "bg-emerald-500" },
    { name: "SOC 2 Type II", controls: "89/120", score: 74, status: "Partial", color: "bg-amber-500" },
    { name: "NIST CSF", controls: "56/82", score: 68, status: "Partial", color: "bg-amber-500" },
  ];

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

        <div className="bg-slate-100 p-1 rounded-full flex items-center shadow-inner">
          <span className="px-5 py-1.5 text-slate-600 font-medium text-sm rounded-full">AI Chat Bot</span>
          <span className="px-5 py-1.5 text-slate-600 font-semibold text-sm rounded-full bg-blue-600 shadow-sm text-white">
            GRC Co-Pilot (Auditing)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            JD
          </div>
          <span className="text-sm font-semibold text-slate-700 hidden sm:inline">John Doe</span>
        </div>
      </header>

      {/* GRC CONTENT ENGINE */}
      <main className="flex-1 p-8 overflow-y-auto w-full max-w-[1400px] mx-auto flex flex-col custom-scrollbar">
        
        {/* Page Title Section */}
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight leading-tight">GRC Co-pilot Management</h1>
          <p className="text-slate-500 text-lg mt-1">Upload policies and track compliance scoring across frameworks</p>
        </div>

        {/* 1. POLICY UPLOAD SECTION */}
        <section className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm mb-8">
          <div className="flex items-center gap-3 mb-6">
            <ArrowUpTrayIcon className="w-5 h-5 text-blue-600 stroke-[2.5]" />
            <h2 className="text-xl font-bold text-slate-900">Policy Upload</h2>
          </div>

          {/* Drag and Drop Zone */}
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center bg-slate-50/30 hover:bg-slate-50 transition-colors cursor-pointer group">
            <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
              <DocumentIcon className="w-8 h-8 text-slate-400 stroke-[1.5]" />
            </div>
            <p className="text-slate-900 font-bold text-lg">
              <span className="text-blue-600 hover:underline">Click to upload</span> or drag and drop
            </p>
            <p className="text-slate-500 text-sm mt-1 font-medium uppercase tracking-wide">PDF, DOCX up to 50MB</p>
          </div>

          {/* Recently Uploaded List */}
          <div className="mt-8">
            <h3 className="text-sm font-bold text-slate-700 mb-4 tracking-wide">Recently Uploaded</h3>
            <div className="space-y-3">
              {recentlyUploaded.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-5 border border-slate-100 rounded-xl bg-white hover:border-slate-300 transition-all shadow-2xs">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <DocumentIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{file.name}</h4>
                      <p className="text-slate-500 text-sm font-medium">
                        {file.type} • Uploaded {file.date}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold ${file.statusColor}`}>
                    {file.status === "Processed" ? (
                      <CheckCircleIcon className="w-4 h-4" />
                    ) : (
                      <ClockIcon className="w-4 h-4 animate-spin" />
                    )}
                    {file.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. COMPLIANCE SCOREBOARD SECTION */}
        <section className="mt-4">
          <div className="flex items-center gap-3 mb-6">
            <ChartBarIcon className="w-5 h-5 text-blue-600 stroke-[2.5]" />
            <h2 className="text-xl font-bold text-slate-900">Compliance Scoreboard</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {scoreboard.map((item, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{item.name}</h3>
                    <p className="text-slate-500 font-medium text-base mt-1">Controls: {item.controls}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-slate-900 tracking-tight">{item.score}%</div>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full border text-xs font-bold ${
                      item.status === "Compliant" ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-amber-600 bg-amber-50 border-amber-100"
                    }`}>
                      {item.status === "Compliant" ? (
                        <CheckCircleIcon className="w-3 h-3" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                      )}
                      {item.status}
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar Container */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`${item.color} h-full rounded-full transition-all duration-1000`} 
                    style={{ width: `${item.score}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Floating Help Button */}
      <div className="fixed bottom-6 right-6">
        <button className="p-3 bg-[#1a2333] hover:bg-black text-white rounded-full shadow-lg transition-transform active:scale-90">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </button>
      </div>
    </div>
  );
}