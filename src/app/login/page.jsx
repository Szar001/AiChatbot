"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, saveSession, getDefaultPageForRole, ROLE_LABELS } from "../../lib/auth";

const DEMO_ACCOUNTS = [
  { email: "user@sterlingtrust.com", role: "user" },
  { email: "servicedesk@sterlingtrust.com", role: "service_desk_officer" },
  { email: "governance@sterlingtrust.com", role: "governance" },
  { email: "defense@sterlingtrust.com", role: "defense" },
  { email: "attack@sterlingtrust.com", role: "attack_security" },
  { email: "auditor@sterlingtrust.com", role: "auditor" },
  { email: "ciso@sterlingtrust.com", role: "ciso" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed.");
      }
      saveSession(data.token, data.user);
      router.push(getDefaultPageForRole(data.user.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Sterling Trust Bank Plc</h1>
          <p className="text-slate-500 text-sm mt-1">AI Automated Tech Support Desk</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              placeholder="you@sterlingtrust.com"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition disabled:opacity-50"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Demo accounts (password: password123)</p>
          <div className="grid grid-cols-1 gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => { setEmail(acc.email); setPassword("password123"); }}
                className="text-left text-xs px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-slate-600"
              >
                <span className="font-bold">{ROLE_LABELS[acc.role]}</span> — {acc.email}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
