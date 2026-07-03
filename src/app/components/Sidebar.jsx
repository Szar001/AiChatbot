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
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { getUser, clearSession, PAGE_ACCESS, ROLE_LABELS } from "../../lib/auth";

const NAV_ITEMS = [
  { href: "/", label: "AI Chat", icon: HomeIcon },
  { href: "/requests", label: "Requests", icon: ShieldCheckIcon },
  { href: "/serviceteams", label: "Service Teams", icon: FolderIcon },
  { href: "/servicedesk", label: "Service Desk", icon: UserCircleIcon },
  { href: "/grcmanagement", label: "GRC Management", icon: Cog6ToothIcon },
  { href: "/grcquery", label: "GRC Query", icon: Cog6ToothIcon },
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

  const visibleItems = user
    ? NAV_ITEMS.filter((item) => PAGE_ACCESS[item.href]?.includes(user.role))
    : [];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          isOpen
            ? "opacity-100 visible"
            : "opacity-0 invisible"
        }`}
      />

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-72 bg-[#101827] text-white z-50 transform transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-700 flex-shrink-0">
          <h2 className="font-bold text-lg">
            Security SOC
          </h2>

          <button onClick={() => setIsOpen(false)}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {user && (
          <div className="px-6 py-4 border-b border-slate-800">
            <p className="font-bold text-sm">{user.name}</p>
            <p className="text-xs text-slate-400">{ROLE_LABELS[user.role] || user.role}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="mt-6 px-4 space-y-2 flex-1">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800"
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        {user && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 mx-4 mb-6 rounded-lg hover:bg-slate-800 text-slate-300"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Log Out
          </button>
        )}
      </aside>
    </>
  );
}
