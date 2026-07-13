"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Shield,
  FileSearch,
  Database,
  Download
} from "lucide-react";
import { Bars3Icon } from '@heroicons/react/24/outline';
import Sidebar from '../components/Sidebar';
import HeaderTabs from '../components/HeaderTabs';
import { authFetch, useAuthGuard } from '../../lib/auth';

function HighlightedText({ text, terms }) {
  if (!terms || terms.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, idx) =>
        terms.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
          <mark key={idx} className="bg-green-100 text-green-800 font-semibold rounded px-0.5">
            {part}
          </mark>
        ) : (
          <React.Fragment key={idx}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

function downloadSnippet(res) {
  const content = `${res.source} — ${res.clause}\n\n${res.text}`;
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${res.source.replace(/\s+/g, "_")}_${res.clause.replace(/\s+/g, "_")}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function GRCQueryPage() {
  const { user, checked } = useAuthGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedFramework, setSelectedFramework] = useState("all");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await authFetch("/api/v1/grc-query/history");
      const data = await response.json();
      if (!response.ok) return;
      setQueryHistory(data.history || []);
    } catch {}
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (checked) fetchHistory();
  }, [checked, fetchHistory]);

  const runQuery = async (queryText) => {
    const text = (queryText ?? query).trim();
    if (!text) return;

    setIsSearching(true);
    try {
      const response = await authFetch("/api/v1/grc-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, framework: selectedFramework }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "GRC query failed.");
      }

      setSearchResults(data.results);
      setSearchError(null);
      fetchHistory();
    } catch (err) {
      setSearchError(err.message);
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickQuery = (text) => {
    setQuery(text);
    runQuery(text);
  };

  const frameworks = [
    { value: "all", label: "All Frameworks" },
    { value: "iso27001", label: "ISO 27001" },
    { value: "gdpr", label: "GDPR" },
    { value: "soc2", label: "SOC 2 Type II" },
    { value: "nist", label: "NIST CSF" }
  ];

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
          <span className="text-base font-semibold text-slate-700 hidden sm:inline">{user.name}</span>
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
                  onKeyDown={(e) => e.key === "Enter" && runQuery()}
                  placeholder="Search compliance controls, policies, or audit findings..."
                  className="w-full px-4 py-2 pl-11 border border-slate-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              </div>

              <button
                onClick={() => runQuery()}
                disabled={isSearching || !query.trim()}
                className="px-6 py-2 bg-slate-900 text-white font-bold text-base rounded-xl hover:bg-black transition shadow-2xs active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
            </div>

            {/* Quick Helper Shortcut Queries */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs font-bold text-slate-400 tracking-wide uppercase mr-1">Quick queries:</span>
              <button
                onClick={() => handleQuickQuery("Show all non-compliant controls")}
                className="text-sm font-bold px-3 py-1.5 bg-slate-100 border border-transparent text-slate-700 rounded-lg hover:bg-slate-200 hover:border-slate-300 transition-all"
              >
                Non-compliant controls
              </button>
              <button
                onClick={() => handleQuickQuery("List critical findings")}
                className="text-sm font-bold px-3 py-1.5 bg-slate-100 border border-transparent text-slate-700 rounded-lg hover:bg-slate-200 hover:border-slate-300 transition-all"
              >
                Critical findings
              </button>
              <button
                onClick={() => handleQuickQuery("Show open action items")}
                className="text-sm font-bold px-3 py-1.5 bg-slate-100 border border-transparent text-slate-700 rounded-lg hover:bg-slate-200 hover:border-slate-300 transition-all"
              >
                Open action items
              </button>
            </div>

            {searchError && (
              <p className="text-red-600 text-sm font-semibold">{searchError}</p>
            )}

            {searchResults && (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-400 tracking-wide uppercase">
                  {searchResults.length} matching clause(s)
                </span>
                {searchResults.map((res, idx) => (
                  <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-slate-50/40">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{res.source} — {res.clause}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          {(res.relevance_score * 100).toFixed(1)}% match
                        </span>
                        <button
                          onClick={() => downloadSnippet(res)}
                          title="Download this citation as evidence"
                          className="p-1.5 rounded-md hover:bg-slate-200 transition text-slate-500"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                      <HighlightedText text={res.text} terms={res.highlight_terms} />
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit History Inquiries Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center gap-2.5 mb-5">
            <Database className="w-5 h-5 text-blue-600 stroke-[2.5]" />
            <h2 className="text-lg font-bold text-slate-800">Recent Audit Queries</h2>
          </div>

          <div className="space-y-3">
            {queryHistory.length === 0 && (
              <p className="text-sm text-slate-400 font-medium">
                No queries run yet this session. Run a search above to populate this history.
              </p>
            )}
            {queryHistory.map((item) => {
              const noMatches = /^0 result/.test(item.summary || "");
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-white hover:border-slate-300 transition-all cursor-pointer shadow-3xs hover:shadow-2xs"
                  onClick={() => { setQuery(item.query_text); runQuery(item.query_text); }}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-400">
                      <FileSearch className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-base text-slate-900">{item.query_text}</p>
                      <p className="text-sm text-slate-400 font-medium mt-0.5">
                        {new Date(item.timestamp).toLocaleString()} • {item.summary}
                      </p>
                    </div>
                  </div>
                  <div>
                    {noMatches ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        No matches
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
                        <Shield className="w-3.5 h-3.5" />
                        Matched
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
