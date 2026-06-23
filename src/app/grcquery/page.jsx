"use client";

import React, { useState } from 'react';
import { 
  Search, 
  Shield, 
  AlertTriangle, 
  FileSearch, 
  Database 
} from "lucide-react";
import { Bars3Icon } from '@heroicons/react/24/outline';
import Sidebar from '../components/Sidebar';

export default function GRCQueryPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedFramework, setSelectedFramework] = useState("all");

  const auditQueries = [
    {
      id: "1",
      query: "Show all non-compliant controls for ISO 27001",
      timestamp: "2026-05-21 09:15",
      results: 12,
      severity: "high"
    },
    {
      id: "2",
      query: "List data processing activities without GDPR consent",
      timestamp: "2026-05-20 14:30",
      results: 3,
      severity: "critical"
    },
    {
      id: "3",
      query: "Identify systems missing encryption at rest",
      timestamp: "2026-05-19 11:20",
      results: 8,
      severity: "medium"
    }
  ];

  const complianceFindings = [
    {
      id: "1",
      title: "Access Control Policy Gaps",
      framework: "ISO 27001",
      control: "A.9.2.1",
      severity: "high",
      status: "open",
      description: "User registration and de-registration processes are not fully documented"
    },
    {
      id: "2",
      title: "Missing Data Retention Schedule",
      framework: "GDPR",
      control: "Art. 5(1)(e)",
      severity: "critical",
      status: "open",
      description: "No documented retention period for customer personal data"
    },
    {
      id: "3",
      title: "Incomplete Change Management Log",
      framework: "SOC 2",
      control: "CC8.1",
      severity: "medium",
      status: "in-progress",
      description: "Change logs missing approval documentation for Q1 2026"
    }
  ];

  const frameworks = [
    { value: "all", label: "All Frameworks" },
    { value: "iso27001", label: "ISO 27001" },
    { value: "gdpr", label: "GDPR" },
    { value: "soc2", label: "SOC 2 Type II" },
    { value: "nist", label: "NIST CSF" }
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
          <span className="text-base font-semibold text-slate-700 hidden sm:inline">John Doe</span>
        </div>
      </header>

      {/* INDEPENDENTLY SCROLLABLE WORKSPACE LAYOUT */}
      <main className="flex-1 p-6 overflow-y-auto w-full max-w-[1400px] mx-auto space-y-6 custom-scrollbar">
        <div>
          <h1 className="text-[30px] font-bold text-slate-900 tracking-tight">GRC Co-pilot Query Interface</h1>
          <p className="text-slate-500 text-[15px] mt-0.5">Sensitive auditing and compliance checks across frameworks</p>
        </div>

        {/* Query Input Interface Block */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center gap-2.5 mb-5">
            <Search className="w-5 h-5 text-blue-600 stroke-[2.5]" />
            <h2 className="text-lg font-bold text-slate-800">Compliance Query</h2>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-base font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {frameworks.map((framework) => (
                  <option key={framework.value} value={framework.value}>
                    {framework.label}
                  </option>
                ))}
              </select>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search compliance controls, policies, or audit findings..."
                  className="w-full px-4 py-2 pl-11 border border-slate-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              </div>

              <button className="px-6 py-2 bg-slate-900 text-white font-bold text-base rounded-xl hover:bg-black transition shadow-2xs active:scale-98">
                Search
              </button>
            </div>

            {/* Quick Helper Shortcut Queries */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs font-bold text-slate-400 tracking-wide uppercase mr-1">Quick queries:</span>
              <button className="text-sm font-bold px-3 py-1.5 bg-slate-100 border border-transparent text-slate-700 rounded-lg hover:bg-slate-200 hover:border-slate-300 transition-all">
                Non-compliant controls
              </button>
              <button className="text-sm font-bold px-3 py-1.5 bg-slate-100 border border-transparent text-slate-700 rounded-lg hover:bg-slate-200 hover:border-slate-300 transition-all">
                Critical findings
              </button>
              <button className="text-sm font-bold px-3 py-1.5 bg-slate-100 border border-transparent text-slate-700 rounded-lg hover:bg-slate-200 hover:border-slate-300 transition-all">
                Open action items
              </button>
            </div>
          </div>
        </div>

        {/* Recent Audit History Inquiries Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center gap-2.5 mb-5">
            <Database className="w-5 h-5 text-blue-600 stroke-[2.5]" />
            <h2 className="text-lg font-bold text-slate-800">Recent Audit Queries</h2>
          </div>

          <div className="space-y-3">
            {auditQueries.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-white hover:border-slate-300 transition-all cursor-pointer shadow-3xs hover:shadow-2xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400">
                    <FileSearch className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-base text-slate-900">{item.query}</p>
                    <p className="text-sm text-slate-400 font-medium mt-0.5">
                      {item.timestamp} • {item.results} results
                    </p>
                  </div>
                </div>
                <div>
                  {item.severity === "critical" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Critical
                    </span>
                  )}
                  {item.severity === "high" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      High
                    </span>
                  )}
                  {item.severity === "medium" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
                      <Shield className="w-3.5 h-3.5" />
                      Medium
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Active Findings Log Layer */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center gap-2.5 mb-5">
            <Shield className="w-5 h-5 text-blue-600 stroke-[2.5]" />
            <h2 className="text-lg font-bold text-slate-800">Active Compliance Findings</h2>
          </div>

          <div className="space-y-4">
            {complianceFindings.map((finding) => (
              <div
                key={finding.id}
                className="border border-slate-100 bg-white rounded-xl p-5 hover:border-slate-300 transition-all shadow-3xs"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-[16px] text-slate-900">{finding.title}</h3>
                      {finding.severity === "critical" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-sm uppercase tracking-wide">
                          <AlertTriangle className="w-3 h-3" />
                          Critical
                        </span>
                      )}
                      {finding.severity === "high" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-sm uppercase tracking-wide">
                          <AlertTriangle className="w-3 h-3" />
                          High
                        </span>
                      )}
                      {finding.severity === "medium" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-sm uppercase tracking-wide">
                          <Shield className="w-3 h-3" />
                          Medium
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[15px] text-slate-500 leading-relaxed">{finding.description}</p>
                    
                    <div className="flex items-center gap-2 pt-1">
                      <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-md text-sm font-semibold">
                        {finding.framework}
                      </span>
                      <span className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded-md text-sm font-medium">
                        Control: {finding.control}
                      </span>
                    </div>
                  </div>

                  <div>
                    {finding.status === "open" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-wider">
                        Open
                      </span>
                    )}
                    {finding.status === "in-progress" && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}