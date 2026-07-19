const UTC_PLUS_1_OFFSET_MS = 60 * 60 * 1000;

export function formatUtcPlus1(isoTimestamp) {
  if (!isoTimestamp) return "";
  const shifted = new Date(new Date(isoTimestamp).getTime() + UTC_PLUS_1_OFFSET_MS);
  const date = shifted.toISOString().slice(0, 10);
  const time = shifted.toISOString().slice(11, 16);
  return `${date} ${time} UTC+1`;
}

export function elapsedSince(isoTimestamp) {
  const created = new Date(isoTimestamp).getTime();
  const diffMs = Math.max(Date.now() - created, 0);
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

export function isOverdue(slaDeadline) {
  if (!slaDeadline) return false;
  return Date.now() > new Date(slaDeadline).getTime();
}

/**
 * Time Spent vs Time Due. The SLA clock never clamps at zero: once breached,
 * `overtime` keeps growing so the request can show how far past due it is.
 */
export function timeSpentVsDue(createdAt, slaDeadline) {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const timeSpentMs = Math.max(now - created, 0);

  if (!slaDeadline) {
    return { timeSpentMs, breached: false, remainingMs: null, overtimeMs: null };
  }

  const due = new Date(slaDeadline).getTime();
  const breached = now > due;
  return {
    timeSpentMs,
    breached,
    remainingMs: breached ? null : due - now,
    overtimeMs: breached ? now - due : null,
  };
}

function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatSlaStatus(createdAt, slaDeadline) {
  const { breached, remainingMs, overtimeMs } = timeSpentVsDue(createdAt, slaDeadline);
  if (!slaDeadline) return null;
  if (breached) {
    return { breached: true, label: `Breached — ${formatDuration(overtimeMs)} overtime` };
  }
  return { breached: false, label: `On track — ${formatDuration(remainingMs)} remaining` };
}
