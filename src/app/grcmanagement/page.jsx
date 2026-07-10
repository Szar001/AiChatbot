"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bars3Icon,
  ArrowUpTrayIcon,
  DocumentIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Sidebar from '../components/Sidebar';
import HeaderTabs from '../components/HeaderTabs';
import { authFetch, useAuthGuard } from '../../lib/auth';

const STATUS_COLORS = {
  Processed: "text-emerald-600 bg-emerald-50 border-emerald-100",
  Processing: "text-amber-600 bg-amber-50 border-amber-100",
  Failed: "text-red-600 bg-red-50 border-red-100",
};

export default function GRCManagementPage() {
  const { user, checked } = useAuthGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fileInputRef = React.useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadAsTestData, setUploadAsTestData] = useState(false);

  const [recentlyUploaded, setRecentlyUploaded] = useState([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(true);

  const [gapData, setGapData] = useState(null);
  const [isLoadingGaps, setIsLoadingGaps] = useState(true);
  const [gapsError, setGapsError] = useState(null);

  const [scoreboard, setScoreboard] = useState(null);
  const [scoreboardError, setScoreboardError] = useState(null);

  const fetchScoreboard = useCallback(async () => {
    try {
      const response = await authFetch("/api/v1/compliance-scoreboard");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load compliance scoreboard.");
      setScoreboard(data.scoreboard);
      setScoreboardError(null);
    } catch (err) {
      setScoreboardError(err.message);
    }
  }, []);

  const fetchPolicies = useCallback(async () => {
    try {
      const response = await authFetch("/api/v1/policies");
      const data = await response.json();
      if (response.ok) {
        setRecentlyUploaded(data.policies || []);
      }
    } catch {
      // Silently keep whatever list is already shown; upload errors surface separately.
    } finally {
      setIsLoadingPolicies(false);
    }
  }, []);

  const fetchGaps = useCallback(async () => {
    try {
      const response = await authFetch("/api/v1/grc-gaps");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load compliance gap analysis.");
      }
      setGapData(data);
      setGapsError(null);
    } catch (err) {
      setGapsError(err.message);
    } finally {
      setIsLoadingGaps(false);
    }
  }, []);

  useEffect(() => {
    // fetchPolicies/fetchGaps only set state after their internal `await` resolves; this is a
    // standard data-fetch-on-mount effect, not a synchronous setState call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (checked) { fetchPolicies(); fetchGaps(); fetchScoreboard(); }
  }, [checked, fetchPolicies, fetchGaps, fetchScoreboard]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("is_test_data", uploadAsTestData ? "true" : "false");

      const response = await authFetch("/api/v1/upload-policy", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed.");
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
      fetchPolicies();
      fetchGaps();
      fetchScoreboard();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    uploadFile(file);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    uploadFile(file);
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
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <div
            onClick={handleUploadClick}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center bg-slate-50/30 hover:bg-slate-50 transition-colors cursor-pointer group"
          >
            <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
              <DocumentIcon className="w-8 h-8 text-slate-400 stroke-[1.5]" />
            </div>
            <p className="text-slate-900 font-bold text-lg">
              <span className="text-blue-600 hover:underline">
                {isUploading ? "Uploading..." : "Click to upload"}
              </span>{" "}
              or drag and drop
            </p>
            <p className="text-slate-500 text-sm mt-1 font-medium uppercase tracking-wide">PDF, DOCX up to 50MB</p>
            <label
              onClick={(e) => e.stopPropagation()}
              className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500"
            >
              <input
                type="checkbox"
                checked={uploadAsTestData}
                onChange={(e) => setUploadAsTestData(e.target.checked)}
              />
              Upload as test/fake policy (exercises the scoreboard, excluded from real compliance scoring)
            </label>
            {uploadError && (
              <p className="text-red-600 text-sm mt-2 font-semibold">{uploadError}</p>
            )}
          </div>

          {/* Recently Uploaded List */}
          <div className="mt-8">
            <h3 className="text-sm font-bold text-slate-700 mb-4 tracking-wide">Recently Uploaded</h3>
            <div className="space-y-3">
              {isLoadingPolicies && (
                <p className="text-sm text-slate-400 font-medium">Loading uploaded policies...</p>
              )}
              {!isLoadingPolicies && recentlyUploaded.length === 0 && (
                <p className="text-sm text-slate-400 font-medium">
                  No policies uploaded yet. Upload a PDF, DOCX, or TXT above to feed the GRC Co-Pilot.
                </p>
              )}
              {recentlyUploaded.map((file) => (
                <div key={file.stored_as} className="flex items-center justify-between p-5 border border-slate-100 rounded-xl bg-white hover:border-slate-300 transition-all shadow-2xs">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <DocumentIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{file.filename}</h4>
                      <p className="text-slate-500 text-sm font-medium">
                        {file.type} • Uploaded {new Date(file.uploaded_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-bold ${STATUS_COLORS[file.status] || STATUS_COLORS.Processing}`}>
                    {file.status === "Processed" && <CheckCircleIcon className="w-4 h-4" />}
                    {file.status === "Processing" && <ClockIcon className="w-4 h-4 animate-spin" />}
                    {file.status === "Failed" && <ExclamationTriangleIcon className="w-4 h-4" />}
                    {file.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. COMPLIANCE SCOREBOARD SECTION */}
        <section className="mt-4">
          <div className="flex items-center gap-3 mb-2">
            <ChartBarIcon className="w-5 h-5 text-blue-600 stroke-[2.5]" />
            <h2 className="text-xl font-bold text-slate-900">Compliance Scoreboard</h2>
          </div>
          <p className="text-slate-400 text-xs mb-6">
            Live score: percentage of baseline NDPA 2023 / CBN Risk-Based Cybersecurity Framework clauses
            adequately covered by your uploaded (non-test) policies.
          </p>

          {scoreboardError && <p className="text-sm text-red-600 font-semibold">{scoreboardError}</p>}
          {scoreboard && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm max-w-md">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Overall Compliance</h3>
                  <p className="text-slate-500 font-medium text-base mt-1">
                    {scoreboard.covered}/{scoreboard.total} clauses covered
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-slate-900 tracking-tight">{scoreboard.score_pct}%</div>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full border text-xs font-bold ${
                    scoreboard.score_pct >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-amber-600 bg-amber-50 border-amber-100"
                  }`}>
                    {scoreboard.score_pct >= 80 ? <CheckCircleIcon className="w-3 h-3" /> : <div className="w-2 h-2 rounded-full bg-amber-500" />}
                    {scoreboard.score_pct >= 80 ? "Compliant" : "Partial"}
                  </div>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`${scoreboard.score_pct >= 80 ? "bg-emerald-500" : "bg-amber-500"} h-full rounded-full transition-all duration-1000`}
                  style={{ width: `${scoreboard.score_pct}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* 3. AI-DETECTED COMPLIANCE GAPS SECTION */}
        <section className="mt-8">
          <div className="flex items-center gap-3 mb-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 stroke-[2.5]" />
            <h2 className="text-xl font-bold text-slate-900">AI-Detected Framework &amp; Policy Gaps</h2>
          </div>
          <p className="text-slate-400 text-xs mb-6">
            Baseline NDPA 2023 / CBN Risk-Based Cybersecurity Framework clauses checked against your uploaded policies for substantive coverage.
          </p>

          {isLoadingGaps && (
            <p className="text-sm text-slate-400 font-medium">Running gap analysis...</p>
          )}
          {gapsError && (
            <p className="text-sm text-red-600 font-semibold">{gapsError}</p>
          )}
          {!isLoadingGaps && !gapsError && gapData && (
            <>
              <div className="flex items-center gap-4 mb-4">
                <span className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold">
                  {gapData.covered_count} / {gapData.total_clauses} clauses covered
                </span>
                <span className="px-3 py-1.5 rounded-full bg-red-50 border border-red-100 text-red-700 text-xs font-bold">
                  {gapData.uncovered_count} gap(s) detected
                </span>
              </div>
              <div className="space-y-3">
                {gapData.gaps.map((gap, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-xl p-4 ${gap.covered ? "border-emerald-100 bg-emerald-50/30" : "border-red-100 bg-red-50/30"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{gap.source} — {gap.clause}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${gap.covered ? "text-emerald-700 bg-emerald-100" : "text-red-700 bg-red-100"}`}>
                        {gap.covered ? `Covered (${(gap.best_coverage_score * 100).toFixed(0)}% match)` : "Gap — no matching policy"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{gap.text}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

      </main>

      {/* Floating Help Button */}
      <div className="fixed bottom-6 right-6">
        <button
          title="Help — coming soon"
          disabled
          className="p-3 bg-[#1a2333] text-white rounded-full shadow-lg opacity-50 cursor-not-allowed"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </button>
      </div>
    </div>
  );
}