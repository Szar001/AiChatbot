"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:5000";

const TOKEN_KEY = "stb_token";
const USER_KEY = "stb_user";

export const ROLE_LABELS = {
  user: "User",
  service_desk_officer: "Service Desk Officer",
  governance: "Governance",
  defense: "Defence",
  attack_security: "Attack Security",
  auditor: "Auditor",
  ciso: "CISO",
};

// Per-page access matrix. "/" (AI Chat) is reachable by every authenticated role.
export const PAGE_ACCESS = {
  "/": ["user", "service_desk_officer", "governance", "defense", "attack_security", "auditor", "ciso"],
  "/requests": ["user", "ciso"],
  "/serviceteams": ["governance", "defense", "attack_security", "ciso"],
  "/servicedesk": ["service_desk_officer", "ciso"],
  "/grcmanagement": ["governance", "ciso"],
  "/grcquery": ["governance", "auditor", "ciso"],
  "/slaconfig": ["service_desk_officer", "ciso"],
  "/securityposture": ["ciso", "auditor", "governance", "defense", "attack_security"],
  "/exploitplaybook": ["attack_security", "defense", "ciso"],
  "/pentestscheduler": ["attack_security", "ciso"],
};

export function getDefaultPageForRole(role) {
  return Object.keys(PAGE_ACCESS).find((page) => PAGE_ACCESS[page].includes(role)) || "/";
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function authFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

/**
 * Redirects to /login if no session exists, or to the user's default page
 * if their role isn't permitted on the current route.
 */
export function useAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Reads localStorage on mount/navigation; not a synchronous derived-state update.
    const current = getUser();
    if (!current) {
      router.replace("/login");
      return;
    }
    const allowed = PAGE_ACCESS[pathname];
    if (allowed && !allowed.includes(current.role)) {
      router.replace(getDefaultPageForRole(current.role));
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(current);
    setChecked(true);
  }, [router, pathname]);

  return { user, checked };
}
