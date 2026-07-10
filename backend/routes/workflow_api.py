"""
Workflow Automation API: Life Document resolution approval, nudge
documentation, and Vendor & Licence monitoring endpoints.
"""
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request

from engine.access import CATEGORY_TO_ROLE, PRACTITIONER_ROLES
from engine.action_script import ACTIVE_THREAT_CATEGORIES, generate_action_script
from engine.audit_log import get_audit_log_store
from engine.auth import login_required, roles_required
from engine.exploit_playbook import get_exploit_playbook_store
from engine.life_doc import get_life_doc_store
from engine.mailer import draft_life_doc_email, send_mail
from engine.ticket_store import get_ticket_store
from engine.vendor_monitor import get_vendor_monitor

workflow_bp = Blueprint("workflow_api", __name__, url_prefix="/api/v1")

PRACTITIONER_AND_CISO = ("governance", "defense", "attack_security", "ciso")


@workflow_bp.route("/tickets/<ticket_id>/nudge", methods=["POST"])
@roles_required("service_desk_officer", "ciso")
def nudge_ticket(ticket_id):
    """
    Service Desk Officers nudge the assigned team when a ticket is running
    long. Every nudge is documented with who sent it and when, so it shows up
    on both the Service Desk and Requests Management pages.
    """
    payload = request.get_json(silent=True) or {}
    message = (payload.get("message") or "").strip()

    ticket_store = get_ticket_store(current_app.config["TICKET_STORE_PATH"])
    ticket = ticket_store.get(ticket_id)
    if ticket is None:
        return jsonify({"error": f"Ticket {ticket_id} not found."}), 404

    team_label = CATEGORY_TO_ROLE.get(ticket.get("category"), "assigned").replace("_", " ").title()
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "by": request.current_user["name"],
        "message": message or f"Nudged the {team_label} team for a status update.",
    }
    updated = ticket_store.append_to_list(ticket_id, "nudges", entry)
    return jsonify({"ticket": updated}), 201


@workflow_bp.route("/approve-resolution", methods=["POST"])
@roles_required(*PRACTITIONER_AND_CISO)
def approve_resolution():
    payload = request.get_json(silent=True) or {}
    ticket_id = payload.get("ticket_id")
    resolution_text = (payload.get("resolution_text") or "").strip()

    if not ticket_id or not resolution_text:
        return jsonify({"error": "Fields 'ticket_id' and 'resolution_text' are required."}), 400

    ticket_store = get_ticket_store(current_app.config["TICKET_STORE_PATH"])
    ticket = ticket_store.get(ticket_id)
    if ticket is None:
        return jsonify({"error": f"Ticket {ticket_id} not found."}), 404

    user = request.current_user
    if user["role"] in PRACTITIONER_ROLES and CATEGORY_TO_ROLE.get(ticket.get("category")) != user["role"]:
        return jsonify({"error": "This ticket belongs to a different team."}), 403

    reviewer = user["name"]

    # AI drafts the requester-facing email now; a team member must approve it
    # (POST /tickets/<id>/send-life-doc-email) before it actually sends.
    email_draft = draft_life_doc_email(ticket, resolution_text)

    ticket_store.update(ticket_id, {
        "status": "CLOSED",
        "resolution_text": resolution_text,
        "approved": True,
        "reviewer": reviewer,
        "pending_life_doc_email": email_draft,
    })

    life_doc_store = get_life_doc_store(current_app.config["LIFE_DOC_DB_PATH"])
    record = life_doc_store.append_resolution(
        ticket_id=ticket_id,
        resolution_text=resolution_text,
        ticket_title=ticket.get("clean_text", "")[:120],
        category=ticket.get("category", ""),
        reviewer=reviewer,
    )

    if ticket.get("category") in ACTIVE_THREAT_CATEGORIES:
        playbook_store = get_exploit_playbook_store(current_app.config["EXPLOIT_PLAYBOOK_DB_PATH"])
        script = generate_action_script(ticket.get("category"), ticket.get("mitre_tags", []), ticket_id)
        if script:
            playbook_store.add_entry(
                ticket_id=ticket_id,
                mitre_tags=ticket.get("mitre_tags", []),
                title=script["title"],
                test_notes=resolution_text,
            )

    audit_log = get_audit_log_store(current_app.config["AUDIT_LOG_DB_PATH"])
    audit_log.record(
        actor=user,
        action_type="ticket_resolved",
        category=ticket.get("category"),
        ticket_id=ticket_id,
        summary=f"Resolved ticket {ticket_id} ({ticket.get('category', 'Unclassified')})",
    )

    return jsonify({"life_document": record, "pending_life_doc_email": email_draft}), 201


@workflow_bp.route("/tickets/<ticket_id>/send-life-doc-email", methods=["POST"])
@roles_required(*PRACTITIONER_AND_CISO)
def send_life_doc_email(ticket_id):
    """
    Sends the AI-drafted life document email back to the requester once a
    team member has reviewed and approved the draft produced at resolution
    time. Never sends automatically without this explicit approval step.
    """
    ticket_store = get_ticket_store(current_app.config["TICKET_STORE_PATH"])
    ticket = ticket_store.get(ticket_id)
    if ticket is None:
        return jsonify({"error": f"Ticket {ticket_id} not found."}), 404

    draft = ticket.get("pending_life_doc_email")
    if not draft:
        return jsonify({"error": "No pending life document email for this ticket."}), 400

    payload = request.get_json(silent=True) or {}
    subject = payload.get("subject", draft["subject"])
    body = payload.get("body", draft["body"])

    submitter_id = ticket.get("submitted_by_id")
    from engine.user_store import get_user_store
    user_store = get_user_store(current_app.config["USER_STORE_PATH"])
    requester = user_store.get_by_id(submitter_id) if submitter_id else None
    if not requester or not requester.get("email"):
        return jsonify({"error": "Could not resolve the requester's email address."}), 400

    result = send_mail(current_app.config, requester["email"], subject, body)
    ticket_store.update(ticket_id, {"pending_life_doc_email": None, "life_doc_email_sent": result})

    audit_log = get_audit_log_store(current_app.config["AUDIT_LOG_DB_PATH"])
    audit_log.record(
        actor=request.current_user,
        action_type="life_doc_email_sent",
        ticket_id=ticket_id,
        summary=f"Approved and sent life document email for {ticket_id} to {requester['email']}",
    )

    return jsonify({"result": result}), 200


@workflow_bp.route("/life-doc/<ticket_id>", methods=["GET"])
@login_required
def get_life_document(ticket_id):
    ticket_store = get_ticket_store(current_app.config["TICKET_STORE_PATH"])
    ticket = ticket_store.get(ticket_id)
    user = request.current_user

    if ticket is not None:
        from engine.access import can_view_ticket
        if not can_view_ticket(user, ticket):
            return jsonify({"error": "You do not have permission to view this record."}), 403

    life_doc_store = get_life_doc_store(current_app.config["LIFE_DOC_DB_PATH"])
    record = life_doc_store.get_by_ticket_id(ticket_id)
    if record is None:
        return jsonify({"error": f"No life document found for ticket {ticket_id}."}), 404
    return jsonify({"life_document": record}), 200


@workflow_bp.route("/life-doc", methods=["GET"])
@roles_required("governance", "defense", "attack_security", "service_desk_officer", "ciso")
def list_life_documents():
    life_doc_store = get_life_doc_store(current_app.config["LIFE_DOC_DB_PATH"])
    records = life_doc_store.list_all()

    user = request.current_user
    if user["role"] in PRACTITIONER_ROLES:
        records = [r for r in records if CATEGORY_TO_ROLE.get(r.get("category")) == user["role"]]

    return jsonify({"life_documents": records, "count": len(records)}), 200


@workflow_bp.route("/vendors", methods=["GET"])
@roles_required("service_desk_officer", "ciso")
def vendor_dashboard():
    monitor = get_vendor_monitor(current_app.config["VENDOR_STORE_PATH"])
    return jsonify(monitor.get_dashboard()), 200


@workflow_bp.route("/budget", methods=["GET"])
@roles_required("service_desk_officer", "ciso")
def get_budget():
    monitor = get_vendor_monitor(current_app.config["VENDOR_STORE_PATH"])
    return jsonify({"budget": monitor.get_budget()}), 200


@workflow_bp.route("/budget", methods=["POST"])
@roles_required("service_desk_officer", "ciso")
def set_budget():
    """
    Set/activate the security budget. Once an expiry_date is provided and the
    budget is marked active, the Service Desk shows a live countdown to expiry.
    """
    payload = request.get_json(silent=True) or {}
    total = payload.get("total")
    spent = payload.get("spent")
    expiry_date = payload.get("expiry_date")
    active = payload.get("active", True)

    # Validate numeric fields.
    for label, value in (("total", total), ("spent", spent)):
        if value is not None:
            try:
                float(value)
            except (TypeError, ValueError):
                return jsonify({"error": f"Field '{label}' must be a number."}), 400

    # Validate the expiry date format if provided.
    if expiry_date:
        try:
            datetime.strptime(expiry_date, "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Field 'expiry_date' must be in YYYY-MM-DD format."}), 400

    if active and not expiry_date:
        monitor = get_vendor_monitor(current_app.config["VENDOR_STORE_PATH"])
        existing = monitor.get_budget()
        if not existing.get("expiry_date"):
            return jsonify({"error": "An expiry_date is required to activate the budget."}), 400

    monitor = get_vendor_monitor(current_app.config["VENDOR_STORE_PATH"])
    budget = monitor.set_budget(total=total, spent=spent, expiry_date=expiry_date, active=active)
    return jsonify({"budget": budget}), 200


@workflow_bp.route("/budget/renew", methods=["POST"])
@roles_required("service_desk_officer", "ciso")
def renew_budget():
    """Resets the budget countdown to a fresh full term and reactivates it."""
    monitor = get_vendor_monitor(current_app.config["VENDOR_STORE_PATH"])
    budget = monitor.renew_budget()
    if budget is None:
        return jsonify({"error": "No budget term to renew. Set a budget with an expiry date first."}), 400
    return jsonify({"budget": budget}), 200


@workflow_bp.route("/budget/items", methods=["POST"])
@roles_required("service_desk_officer", "ciso")
def add_budget_item():
    """Adds an ad-hoc budgeted line item (e.g. Food, Cybersecurity Awareness)
    and debits it from the budget balance."""
    payload = request.get_json(silent=True) or {}
    category = (payload.get("category") or "").strip()
    description = (payload.get("description") or "").strip()
    amount = payload.get("amount")

    if not category or amount is None:
        return jsonify({"error": "Fields 'category' and 'amount' are required."}), 400
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return jsonify({"error": "Field 'amount' must be a number."}), 400

    monitor = get_vendor_monitor(current_app.config["VENDOR_STORE_PATH"])
    budget = monitor.add_budget_item(category, description, amount)
    return jsonify({"budget": budget}), 201


@workflow_bp.route("/vendors", methods=["POST"])
@roles_required("service_desk_officer", "ciso")
def add_license():
    """Adds a new license/vendor and debits its annual cost from the budget
    balance as a License Tracking item."""
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    vendor_name = (payload.get("vendor_name") or "").strip()
    expiry_date = payload.get("expiry_date")
    annual_cost = payload.get("annual_cost")

    if not name or not vendor_name or not expiry_date or annual_cost is None:
        return jsonify({"error": "Fields 'name', 'vendor_name', 'expiry_date', 'annual_cost' are required."}), 400
    try:
        datetime.strptime(expiry_date, "%Y-%m-%d")
        annual_cost = float(annual_cost)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid 'expiry_date' (YYYY-MM-DD) or 'annual_cost'."}), 400

    monitor = get_vendor_monitor(current_app.config["VENDOR_STORE_PATH"])
    vendor = monitor.add_license(name, vendor_name, expiry_date, annual_cost)
    return jsonify({"vendor": vendor, "budget": monitor.get_budget()}), 201


@workflow_bp.route("/vendors/<vendor_id>/draft-email", methods=["POST"])
@roles_required("service_desk_officer", "ciso")
def draft_vendor_email(vendor_id):
    monitor = get_vendor_monitor(current_app.config["VENDOR_STORE_PATH"])
    draft = monitor.draft_vendor_email(vendor_id)
    if draft is None:
        return jsonify({"error": f"Vendor {vendor_id} not found."}), 404
    return jsonify({"draft": draft}), 200


@workflow_bp.route("/audit-log", methods=["GET"])
@roles_required("service_desk_officer", "auditor", "ciso")
def audit_log_feed():
    """
    Full activity trail of ticket submissions, resolutions, and GRC queries,
    visible to Service Desk Officers, Auditors, and the CISO for oversight.
    """
    audit_log = get_audit_log_store(current_app.config["AUDIT_LOG_DB_PATH"])
    limit = request.args.get("limit", default=50, type=int)
    action_type = request.args.get("action_type")
    records = audit_log.list_recent(limit=limit, action_type=action_type)
    return jsonify({"audit_log": records, "count": len(records)}), 200
