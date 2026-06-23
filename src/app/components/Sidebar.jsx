"use client";

import Link from "next/link";
import {
  XMarkIcon,
  HomeIcon,
  ShieldCheckIcon,
  FolderIcon,
  Cog6ToothIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

export default function Sidebar({ isOpen, setIsOpen }) {
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
        className={`fixed top-0 left-0 h-screen w-72 bg-[#101827] text-white z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-slate-700">
          <h2 className="font-bold text-lg">
            Security SOC
          </h2>

          <button onClick={() => setIsOpen(false)}>
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-4 space-y-2">

          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800"
          >
            <HomeIcon className="w-5 h-5" />
            AI Chat
          </Link>

          <Link
            href="/requests" onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800"
          >
            <ShieldCheckIcon className="w-5 h-5" />
            Requests
          </Link>

          <Link
            href="/serviceteams"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800"
          >
            <FolderIcon className="w-5 h-5" />
            Service Teams
          </Link>

          <Link
            href="/servicedesk"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800"
          >
            <UserCircleIcon className="w-5 h-5" />
            Service Desk
          </Link>

          <Link
            href="/grcmanagement"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            GRC Management
          </Link>
          <Link
            href="/grcquery"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            GRC Query
          </Link>

        </nav>
      </aside>
    </>
  );
}