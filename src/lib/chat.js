"use client";

import { authFetch } from "./auth";

const CHAT_HISTORY_KEY = "chat_history";

/**
 * Sends a chat message to the backend. The desk classifies each message as
 * either a policy question (answered from the RAG corpus) or an incident
 * (logged as a ticket, auto-tagged and SLA-started). Returns a plain reply
 * string suitable for display in the chat transcript.
 */
export async function sendChatMessage(text) {
  const response = await authFetch("/api/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Failed to send message.");
  }

  if (data.type === "answer") {
    return data.answer;
  }

  if (data.type === "ticket") {
    const t = data.ticket;
    const parts = [
      `Logged as ${t.ticket_id} (${t.category || "Unclassified"}${t.incident_type ? ` — ${t.incident_type}` : ""}, ${t.urgency || "Medium"} urgency). The SLA clock has started.`,
    ];
    if (t.needs_human_review) {
      parts.push("This has been flagged for human review and escalated to the team.");
    }
    if (data.action_script?.title) {
      parts.push(`Suggested action script: ${data.action_script.title}.`);
    }
    return parts.join(" ");
  }

  return data.answer || "";
}

/**
 * Local chat library fallback: real server-side retention/search is owned by
 * the backend, but we keep a local copy so the transcript survives a reload.
 */
export function loadChatHistory() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(messages) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
}
