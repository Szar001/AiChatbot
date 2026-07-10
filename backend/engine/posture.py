"""
Security Posture Scoreboard: aggregates ticket, vendor/budget, exploit
playbook, and telemetry data into a single dashboard so the CISO/auditors
can see overall security posture at a glance.
"""
from datetime import datetime, timezone


def compute_posture(ticket_store, vendor_monitor, exploit_playbook_store, telemetry_store) -> dict:
    tickets = ticket_store.list_all()
    open_tickets = [t for t in tickets if t.get("status") != "CLOSED"]

    by_urgency = {}
    for t in open_tickets:
        urgency = t.get("urgency", "Unclassified")
        by_urgency[urgency] = by_urgency.get(urgency, 0) + 1

    by_stream = {}
    for t in open_tickets:
        category = t.get("category", "Unclassified")
        by_stream[category] = by_stream.get(category, 0) + 1

    now = datetime.now(timezone.utc)
    breached = 0
    for t in open_tickets:
        deadline = t.get("sla_deadline")
        if deadline:
            try:
                if datetime.fromisoformat(deadline) < now:
                    breached += 1
            except ValueError:
                pass
    sla_breach_rate = round((breached / len(open_tickets)) * 100, 1) if open_tickets else 0.0

    dashboard = vendor_monitor.get_dashboard()
    vendor_sla_breaches = sum(1 for v in dashboard["vendors"] if v.get("sla_breach_flag"))

    playbook_entries = exploit_playbook_store.list_all()
    patched = sum(1 for e in playbook_entries if e["status"] == "Patched")
    active = sum(1 for e in playbook_entries if e["status"] == "Active")

    telemetry = telemetry_store.snapshot()

    return {
        "open_tickets_total": len(open_tickets),
        "open_tickets_by_urgency": by_urgency,
        "open_tickets_by_stream": by_stream,
        "sla_breach_rate_pct": sla_breach_rate,
        "vendor_sla_breaches": vendor_sla_breaches,
        "exploit_playbook": {"patched": patched, "active": active, "total": len(playbook_entries)},
        "telemetry": telemetry,
    }
