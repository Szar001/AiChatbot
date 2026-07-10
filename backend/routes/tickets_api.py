"""
Ticket Triage API: ingests raw ticket text, runs it through the LogParser and
TicketClassifier, and persists the result. Approving a resolved ticket
appends the outcome to the Life Document knowledge repository.

Visibility is scoped per the access matrix: general users see only their own
tickets, attack/defense/governance practitioners see only their own team's
tickets, and service desk officers and the CISO see everything.
"""
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request

from engine.access import CATEGORY_TO_ROLE, PRACTITIONER_ROLES, can_view_ticket, filter_visible_tickets
from engine.action_script import generate_action_script
from engine.audit_log import get_audit_log_store
from engine.auth import login_required, roles_required
from engine.life_doc import get_life_doc_store
from engine.log_parser import parse_ticket
from engine.pii_filter import redact
from engine.sla_config import get_sla_config_store
from engine.telemetry import get_telemetry_store
from engine.ticket_classifier import get_classifier
from engine.ticket_store import get_ticket_store
from engine.triage import infer_incident

tickets_bp = Blueprint("tickets_api", __name__, url_prefix="/api/v1")

LIST_ALLOWED_ROLES = ("user", "governance", "defense", "attack_security", "service_desk_officer", "ciso")
PRACTITIONER_AND_CISO = ("governance", "defense", "attack_security", "ciso")


@tickets_bp.route("/tickets", methods=["POST"])
@login_required
def create_ticket():
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or "").strip()

    if not text:
        return jsonify({"error": "Field 'text' is required and cannot be empty."}), 400

    user = request.current_user
    text, redaction_count = redact(text)
    if redaction_count:
        get_telemetry_store(current_app.config["TELEMETRY_STORE_PATH"]).increment("redactions", redaction_count)

    ticket = parse_ticket(text, submitted_by=user["name"])
    ticket["submitted_by_id"] = user["id"]

    classifier = get_classifier()
    classification = classifier.classify(ticket["clean_text"])
    incident = infer_incident(ticket["clean_text"], classification["label"])

    sla_store = get_sla_config_store(current_app.config["SLA_CONFIG_STORE_PATH"])
    staff_type = "internal" if user.get("is_internal", True) else "external"
    deadline = sla_store.compute_deadline(incident["urgency"], staff_type, ticket["created_at"])

    ticket.update({
        "category": classification["label"],
        "confidence": classification["confidence"],
        "needs_human_review": classification["needs_human_review"],
        "classification_scores": classification["scores"],
        "incident_type": incident["incident_type"],
        "urgency": incident["urgency"],
        "sla_deadline": deadline,
        "status": "PENDING_REVIEW" if classification["needs_human_review"] else "ONGOING",
        "resolution_text": None,
        "approved": False,
        "triage_footprint": [],
        "nudges": [],
        "user_notified": False,
    })

    store = get_ticket_store(current_app.config["TICKET_STORE_PATH"])
    store.add(ticket)

    audit_log = get_audit_log_store(current_app.config["AUDIT_LOG_DB_PATH"])
    audit_log.record(
        actor=user,
        action_type="ticket_submitted",
        category=ticket["category"],
        ticket_id=ticket["ticket_id"],
        summary=f"Submitted ticket {ticket['ticket_id']} ({ticket['category']})",
    )
    audit_log.record(
        actor=user,
        action_type="auto_triage",
        category=ticket["category"],
        ticket_id=ticket["ticket_id"],
        summary=(
            f"Auto-tagged {incident['incident_type'] or ticket['category']} -> "
            f"{ticket['category']} stream, urgency {incident['urgency']}, SLA deadline {deadline}"
        ),
        actor_type="system",
    )

    life_doc_store = get_life_doc_store(current_app.config["LIFE_DOC_DB_PATH"])
    similar_resolutions = life_doc_store.find_similar(ticket["clean_text"])

    action_script = generate_action_script(
        ticket["category"], ticket["mitre_tags"], ticket["ticket_id"]
    )

    return jsonify({
        "ticket": ticket,
        "similar_past_resolutions": similar_resolutions,
        "action_script": action_script,
    }), 201


@tickets_bp.route("/tickets", methods=["GET"])
@roles_required(*LIST_ALLOWED_ROLES)
def list_tickets():
    store = get_ticket_store(current_app.config["TICKET_STORE_PATH"])
    status_filter = request.args.get("status")
    tickets = store.list_all()
    if status_filter:
        tickets = [t for t in tickets if t.get("status", "").lower() == status_filter.lower()]
    tickets = filter_visible_tickets(request.current_user, tickets)
    return jsonify({"tickets": tickets, "count": len(tickets)}), 200


@tickets_bp.route("/tickets/<ticket_id>", methods=["GET"])
@login_required
def get_ticket(ticket_id):
    store = get_ticket_store(current_app.config["TICKET_STORE_PATH"])
    ticket = store.get(ticket_id)
    if ticket is None:
        return jsonify({"error": f"Ticket {ticket_id} not found."}), 404
    if not can_view_ticket(request.current_user, ticket):
        return jsonify({"error": "You do not have permission to view this ticket."}), 403
    return jsonify({"ticket": ticket}), 200


@tickets_bp.route("/tickets/<ticket_id>/footprint", methods=["POST"])
@roles_required(*PRACTITIONER_AND_CISO)
def add_footprint_entry(ticket_id):
    """
    Active Triage Footprint: lets a practitioner log a real-time action against
    a ticket (e.g. "Running Nessus vulnerability sweep"), timestamped in UTC.
    """
    payload = request.get_json(silent=True) or {}
    action = (payload.get("action") or "").strip()
    if not action:
        return jsonify({"error": "Field 'action' is required and cannot be empty."}), 400

    store = get_ticket_store(current_app.config["TICKET_STORE_PATH"])
    ticket = store.get(ticket_id)
    if ticket is None:
        return jsonify({"error": f"Ticket {ticket_id} not found."}), 404

    user = request.current_user
    if user["role"] in PRACTITIONER_ROLES and CATEGORY_TO_ROLE.get(ticket.get("category")) != user["role"]:
        return jsonify({"error": "This ticket belongs to a different team."}), 403

    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "actor": user["name"],
        "action": action,
    }
    updated = store.append_to_list(ticket_id, "triage_footprint", entry)
    return jsonify({"ticket": updated}), 201


@tickets_bp.route("/notifications", methods=["GET"])
@login_required
def list_notifications():
    """
    Unseen closed-ticket notifications for the current user, so the AI chat
    can post an automatic reply once their request has been resolved.
    """
    store = get_ticket_store(current_app.config["TICKET_STORE_PATH"])
    user = request.current_user
    tickets = store.list_all()
    pending = [
        t for t in tickets
        if t.get("submitted_by_id") == user["id"]
        and t.get("status") == "CLOSED"
        and not t.get("user_notified", False)
    ]
    return jsonify({"notifications": pending, "count": len(pending)}), 200


@tickets_bp.route("/notifications/ack", methods=["POST"])
@login_required
def ack_notification():
    payload = request.get_json(silent=True) or {}
    ticket_id = payload.get("ticket_id")
    if not ticket_id:
        return jsonify({"error": "Field 'ticket_id' is required."}), 400

    store = get_ticket_store(current_app.config["TICKET_STORE_PATH"])
    ticket = store.get(ticket_id)
    if ticket is None:
        return jsonify({"error": f"Ticket {ticket_id} not found."}), 404
    if ticket.get("submitted_by_id") != request.current_user["id"]:
        return jsonify({"error": "You do not have permission to acknowledge this ticket."}), 403

    store.update(ticket_id, {"user_notified": True})
    return jsonify({"ok": True}), 200
