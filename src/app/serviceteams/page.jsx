"use client";

import React, { useState } from 'react';
import { DocumentTextIcon, Bars3Icon } from '@heroicons/react/24/outline';
import Sidebar from '../components/Sidebar';

export default function Serviceteams() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const incomingQueue = [
    {
      id: 'INC-001',
      title: 'Malware Detection in Email Attachment',
      priority: 'HIGH',
      desc: 'User reported suspicious email with .exe attachment. Preliminary scan shows potential ransomware signature.',
      team: 'Defence Defenders',
      aiTag: 'AI: Malware/Phishing',
      pStyles: 'text-amber-700 bg-amber-50 border-amber-200'
    },
    {
      id: 'INC-002',
      title: 'NDPA Compliance Query',
      priority: 'MEDIUM',
      desc: 'Request for clarification on data retention policies under NDPA 2023 Section 14(b).',
      team: 'Governance',
      aiTag: 'AI: Compliance/Regulatory',
      pStyles: 'text-yellow-700 bg-yellow-50 border-yellow-200'
    },
    {
      id: 'INC-003',
      title: 'SQL Injection Attempt Logged',
      priority: 'CRITICAL',
      desc: 'WAF intercepted malicious payload targeting customer database entry points.',
      team: 'Defence Defenders',
      aiTag: 'AI: Exploit Attempt',
      pStyles: 'text-red-700 bg-red-50 border-red-200'
    }
  ];

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
        <div className="bg-slate-100 p-1 rounded-full flex items-center shadow-inner">
          <span className="px-5 py-1.5 text-slate-600 font-medium text-sm rounded-full">AI Chat Bot</span>
          <span className="px-5 py-1.5 text-slate-600 font-semibold text-sm rounded-full bg-white shadow-xs text-slate-900">
            GRC Co-Pilot (Auditing)
          </span>
        </div>

        {/* Right Side User Profile Badge */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            JD
          </div>
          <span className="text-sm font-semibold text-slate-700 hidden sm:inline">John Doe</span>
        </div>
      </header>

      {/* ==================== FULL-SCREEN CONTENT DASHBOARD ==================== */}
      <main className="flex-1 p-6 overflow-hidden w-full max-w-[1600px] mx-auto flex flex-col">
        
        {/* Main Interface Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden h-full min-h-0">
          
          {/* LEFT COLUMN: INCOMING QUEUE */}
          <div className="flex flex-col h-full border-r border-slate-200 min-h-0">
            {/* Column Title Section */}
            <div className="p-6 pb-4 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-[24px] font-bold text-slate-900 tracking-tight">Incoming Queue</h2>
              <p className="text-slate-400 text-xs mt-0.5">Select a complaint to begin resolution</p>
            </div>

            {/* Scrollable Container for Incidents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white custom-scrollbar">
              {incomingQueue.map((inc) => (
                <div 
                  key={inc.id} 
                  className="border border-slate-100 hover:border-slate-200 rounded-xl p-5 space-y-3 bg-white transition-all cursor-pointer group shadow-2xs hover:shadow-xs hover:bg-slate-50/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 tracking-wider">{inc.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wide uppercase ${inc.pStyles}`}>
                      {inc.priority}
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-slate-900 text-[16px] group-hover:text-blue-600 transition-colors">
                    {inc.title}
                  </h4>
                  
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {inc.desc}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-md text-xs font-medium">
                      {inc.team}
                    </span>
                    <span className="px-2.5 py-1 bg-purple-50 border border-purple-100 text-purple-700 rounded-md text-xs font-semibold">
                      {inc.aiTag}
                    </span>
                  </div>
                </div>
              ))}
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
              
              <button className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 font-bold px-3 py-1.5 rounded-lg text-xs text-slate-700 shadow-2xs transition-all">
                <DocumentTextIcon className="w-4 h-4 text-slate-400" /> 
                My History
              </button>
            </div>

            {/* Empty Center Screen Placeholder State */}
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-white border border-slate-100 rounded-xl flex items-center justify-center shadow-3xs mb-4">
                <DocumentTextIcon className="w-8 h-8 text-slate-300 stroke-[1.25]" />
              </div>
              <p className="text-slate-400 font-medium text-sm tracking-wide max-w-[260px] leading-relaxed">
                Select a complaint from the queue to begin
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}