"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  XMarkIcon,
  HomeIcon,
  ShieldCheckIcon,
  FolderIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { getUser, clearSession, ROLE_LABELS, PAGE_ACCESS } from "../../lib/auth";

const NAV_ITEMS = [
  { href: "/", label: "AI Chat", icon: HomeIcon },
  { href: "/requests", label: "Requests", icon: ShieldCheckIcon },
  { href: "/serviceteams", label: "Service Teams", icon: FolderIcon },
  { href: "/servicedesk", label: "Service Desk", icon: UserCircleIcon },
  { href: "/grcmanagement", label: "GRC Management", icon: Cog6ToothIcon },
  { href: "/grcquery", label: "GRC Query", icon: Cog6ToothIcon },
  { href: "/securityposture", label: "Compliance Scoreboard", icon: ChartBarIcon },
  { href: "/exploitplaybook", label: "Exploit Playbook", icon: BookOpenIcon },
  { href: "/pentestscheduler", label: "Pentest Scheduler", icon: CalendarDaysIcon },
  { href: "/slaconfig", label: "SLA Config", icon: AdjustmentsHorizontalIcon },
  { href: "/usermanagement", label: "User Management", icon: UsersIcon },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Reads localStorage on mount/open; not a synchronous derived-state update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getUser());
  }, [isOpen]);

  const handleLogout = () => {
    clearSession();
    setIsOpen(false);
    router.push("/login");
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          isOpen
            ? "visible opacity-100"
            : "invisible opacity-0"
        }`}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen w-72 transform flex-col bg-[#101827] text-white transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-700 px-6 shrink-0">
          <h2 className="text-lg font-bold">
            Security SOC
          </h2>

          <button onClick={() => setIsOpen(false)}>
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* User */}
        {user && (
          <div className="border-b border-slate-800 px-6 py-4 shrink-0">
            <p className="font-bold text-sm">{user.name}</p>
            <p className="text-xs text-slate-400">{ROLE_LABELS[user.role] || user.role}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="mt-6 flex-1 min-h-0 overflow-y-auto px-4 space-y-2 custom-scrollbar">
          {NAV_ITEMS.filter(
            (item) => !user || !PAGE_ACCESS[item.href] || PAGE_ACCESS[item.href].includes(user.role)
          ).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        {user && (
          <button
            onClick={handleLogout}
            className="mx-4 mb-6 flex items-center gap-3 rounded-lg px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white shrink-0"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Log Out
          </button>
        )}
      </aside>
    </>
  );
}