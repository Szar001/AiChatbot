"""Security Posture Scoreboard API."""
from flask import Blueprint, current_app, jsonify

from engine.audit_log import get_audit_log_store
from engine.auth import roles_required
from engine.exploit_playbook import get_exploit_playbook_store
from engine.posture import compute_posture
from engine.telemetry import get_telemetry_store
from engine.ticket_store import get_ticket_store
from engine.vendor_monitor import get_vendor_monitor

posture_bp = Blueprint("posture_api", __name__, url_prefix="/api/v1")

VIEW_ROLES = ("ciso", "auditor", "governance", "defense", "attack_security", "service_desk_officer")


@posture_bp.route("/security-posture", methods=["GET"])
@roles_required(*VIEW_ROLES)
def security_posture():
    ticket_store = get_ticket_store(current_app.config["TICKET_STORE_PATH"])
    vendor_monitor = get_vendor_monitor(current_app.config["VENDOR_STORE_PATH"])
    playbook_store = get_exploit_playbook_store(current_app.config["EXPLOIT_PLAYBOOK_DB_PATH"])
    telemetry_store = get_telemetry_store(current_app.config["TELEMETRY_STORE_PATH"])

    posture = compute_posture(ticket_store, vendor_monitor, playbook_store, telemetry_store)
    return jsonify({"posture": posture}), 200


@posture_bp.route("/compliance-report", methods=["GET"])
@roles_required("ciso", "auditor")
def compliance_report():
    """
    One-click compliance report: compiles redaction/access-check telemetry
    plus the audit log summary into a formal export for examiners.
    """
    telemetry_store = get_telemetry_store(current_app.config["TELEMETRY_STORE_PATH"])
    audit_log = get_audit_log_store(current_app.config["AUDIT_LOG_DB_PATH"])

    recent = audit_log.list_recent(limit=500)
    action_counts = {}
    for r in recent:
        action_counts[r["action_type"]] = action_counts.get(r["action_type"], 0) + 1

    return jsonify({
        "telemetry": telemetry_store.snapshot(),
        "audit_action_counts": action_counts,
        "audit_events_reviewed": len(recent),
    }), 200
