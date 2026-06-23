"use client";

import React, { useState } from 'react';
import { Bars3Icon, ArrowRightIcon } from '@heroicons/react/24/outline';
import Sidebar from '../components/Sidebar';

export default function ServiceDeskDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiCensoring, setAiCensoring] = useState(true);
  const [autoApproval, setAutoApproval] = useState(false);
  const [censorIP, setCensorIP] = useState(true);
  const [maskKeys, setMaskKeys] = useState(true);
  const [hideNames, setHideNames] = useState(false);

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
          <span className="px-5 py-1.5 text-slate-600 font-semibold text-sm rounded-full bg-white shadow-xs text-slate-900">
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
              <p className="text-slate-400 text-xs mt-0.5">All active projects with assigned personnel and timers</p>
            </div>

            {/* Row Item 1 */}
            <div className="border border-slate-100 rounded-xl p-5 space-y-3 bg-white">
              <h4 className="font-bold text-slate-800 text-[15px]">ISO 27001 Documentation Review</h4>
              <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Michael Torres
                </span>
                <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                  ⏰ Overdue by 1h
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 font-medium">
                ⚠️ <span className="font-bold">Delay Reason:</span> Awaiting external auditor feedback
              </div>
              <button className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5">
                🔔 Nudge Team Member
              </button>
            </div>

            {/* Row Item 2 */}
            <div className="border border-slate-100 rounded-xl p-5 space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-[15px]">Critical Vulnerability Patch</h4>
                <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded tracking-wide uppercase">
                  Critical
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Emma Wilson
                </span>
                <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded font-bold">
                  ⏰ 45m
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 font-medium">
                ⚠️ <span className="font-bold">Delay Reason:</span> Deployment approval needed from CTO
              </div>
              <button className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5">
                🔔 Nudge Team Member
              </button>
            </div>
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

              <button className="w-full py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition shadow-3xs">
                Advanced Settings
              </button>
            </div>

            {/* Budget & Tracker Node */}
            <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-[15px]">
                💰 <span>Budget & License Tracking</span>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100/80 rounded-xl p-4 space-y-1">
                <span className="text-[10px] font-bold text-emerald-700 tracking-wide uppercase">Q2 2026 Security Budget</span>
                <div className="text-[28px] font-black text-emerald-900 leading-none">$124,500</div>
                <span className="text-[11px] text-emerald-700/80 font-medium block pt-1">Remaining from $200,000</span>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-slate-900 h-full rounded-full" style={{ width: '62.25%' }} />
                </div>
              </div>
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
                <div className="flex items-center gap-2 text-slate-800 font-bold text-[15px]">
                  💬 <span>Feedback Console</span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">Communicate directly with team members on pending cases</p>
              </div>
              <textarea 
                className="w-full min-h-[100px] bg-slate-50/50 border border-slate-200 rounded-xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-400 resize-none" 
                placeholder="Type your message to the team member..."
              />
              <button className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition shadow-2xs">
                Send Feedback
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
              <div className="flex items-center gap-2 text-slate-800 font-bold text-[15px]">
                📅 <span>License Expirations</span>
              </div>

              <div className="space-y-3">
                {/* Expiration 1 */}
                <div className="border border-red-100 bg-red-50/30 rounded-xl p-3 text-xs">
                  <div className="flex justify-between font-bold text-red-950">
                    <span>Firewall License</span> <span>⚠️</span>
                  </div>
                  <div className="text-red-700 font-semibold mt-1">Expires in <span className="font-bold">12 days</span></div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-red-600 h-full rounded-full" style={{ width: '90%' }} />
                  </div>
                </div>

                {/* Expiration 2 */}
                <div className="border border-slate-100 bg-white rounded-xl p-3 text-xs">
                  <div className="font-bold text-slate-800">SIEM Platform</div>
                  <div className="text-slate-500 font-semibold mt-1">Expires in <span className="font-bold">45 days</span></div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-slate-900 h-full rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>

                {/* Expiration 3 */}
                <div className="border border-slate-100 bg-white rounded-xl p-3 text-xs">
                  <div className="font-bold text-slate-800">EDR Solution</div>
                  <div className="text-slate-500 font-semibold mt-1">Expires in <span className="font-bold">120 days</span></div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-slate-900 h-full rounded-full" style={{ width: '25%' }} />
                  </div>
                </div>

                {/* Expiration 4 */}
                <div className="border border-red-100 bg-red-50/30 rounded-xl p-3 text-xs">
                  <div className="flex justify-between font-bold text-red-950">
                    <span>WAF License</span> <span>⚠️</span>
                  </div>
                  <div className="text-red-700 font-semibold mt-1">Expires in <span className="font-bold">8 days</span></div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-red-600 h-full rounded-full" style={{ width: '95%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Team History Link Node */}
            <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-[14px]">
                👥 <span>Team History</span>
              </div>
              <button className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition shadow-3xs flex items-center justify-center gap-1.5">
                View All Team Members History <ArrowRightIcon className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}