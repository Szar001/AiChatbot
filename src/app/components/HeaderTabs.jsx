"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon } from "@heroicons/react/24/outline";
import { getUser, PAGE_ACCESS, authFetch } from "../../lib/auth";

const POLL_INTERVAL_MS = 15000;

/**
 * Backed by GET/POST /api/v1/notifications[/ack]: unseen closed-ticket
 * notifications for the current user (any role — a request they submitted
 * was resolved). Nudges and new-ticket activity for service teams already
 * surface inline on the Service Desk/Service Teams dashboards themselves.
 */
function NotificationBell({ role }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!role) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const response = await authFetch("/api/v1/notifications");
        const data = await response.json();
        if (!response.ok || cancelled) return;
        setNotifications(data.notifications || []);
      } catch {
        // Notifications are non-critical; a failed poll just leaves the badge stale.
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [role]);

  const ack = async (ticketId) => {
    setNotifications((prev) => prev.filter((n) => n.ticket_id !== ticketId));
    try {
      await authFetch("/api/v1/notifications/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: ticketId }),
      });
    } catch {
      // Non-critical; badge state already updated optimistically.
    }
  };

  if (!role) return null;
  const unreadCount = notifications.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition"
        aria-label="Notifications"
      >
        <BellIcon className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-800">Notifications</p>
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-xs text-slate-400 font-medium">No new notifications.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.ticket_id}
                onClick={() => ack(n.ticket_id)}
                className="w-full text-left p-3 border-b border-slate-50 hover:bg-slate-50 transition"
              >
                <p className="text-xs text-slate-700 font-medium">
                  Your request {n.ticket_id} was resolved.
                </p>
                {n.clean_text && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {n.clean_text.slice(0, 80)}{n.clean_text.length > 80 ? "…" : ""}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

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
    <div className="flex items-center gap-3">
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
      <NotificationBell role={role} />
    </div>
  );
}
