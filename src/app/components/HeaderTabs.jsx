"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getUser, PAGE_ACCESS } from "../../lib/auth";

export default function HeaderTabs() {
  const pathname = usePathname();
  const [role, setRole] = useState(null);

  useEffect(() => {
    // Reads localStorage on mount; not a synchronous derived-state update.
    const user = getUser();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRole(user?.role || null);
  }, []);

  const isChatActive = pathname === "/";
  const isGrcActive = pathname === "/grcquery";
  const canSeeGrc = role && PAGE_ACCESS["/grcquery"].includes(role);

  return (
    <div className="bg-slate-100 p-1 rounded-full flex items-center shadow-inner">
      <Link
        href="/"
        className={`px-5 py-1.5 font-medium text-sm rounded-full transition-all ${
          isChatActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
        }`}
      >
        AI Chat Bot
      </Link>
      {canSeeGrc && (
        <Link
          href="/grcquery"
          className={`px-5 py-1.5 font-semibold text-sm rounded-full transition-all ${
            isGrcActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          GRC Co-Pilot (Auditing)
        </Link>
      )}
    </div>
  );
}
