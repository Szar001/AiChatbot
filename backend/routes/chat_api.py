"""
AI Chat API: the single entry point behind the chat window. It decides whether
an incoming message is a policy/scenario question or an incident/request, then:

  * Question  -> answers from the organisation's own RAG corpus and attaches the
                 raw source snippet(s) the answer was grounded on.
  * Incident  -> logs and categorises a ticket (Attack Security / Defence /
                 Governance) and, for active threats, returns a policy-grounded
                 Technical Action Script.

Every message is documented in the audit trail so chat activity is traceable.
This desk is a private, organisation-scoped assistant: it only ever reasons over
this organisation's uploaded policies plus the shipped regulatory baseline, and
makes no external calls — outside sources cannot reach the data.
"""
from flask import Blueprint, current_app, jsonify, request

from engine.action_script import generate_action_script
from engine.audit_log import get_audit_log_store
from engine.auth import login_required
from engine.chat_orchestrator import build_grounded_answer, classify_intent
from engine.life_doc import get_life_doc_store
from engine.log_parser import parse_ticket
from engine.pii_filter import redact
from engine.rag_copilot import get_copilot
from engine.sla_config import get_sla_config_store
from engine.telemetry import get_telemetry_store
from engine.ticket_classifier import get_classifier
from engine.ticket_store import get_ticket_store
from engine.triage import infer_incident

chat_bp = Blueprint("chat_api", __name__, url_prefix="/api/v1")


@chat_bp.route("/chat", methods=["POST"])
@login_required
def chat():
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Field 'text' is required and cannot be empty."}), 400

    user = request.current_user
    intent = classify_intent(text)
    audit_log = get_audit_log_store(current_app.config["AUDIT_LOG_DB_PATH"])

    if intent == "question":
        copilot = get_copilot()
        results = copilot.query(text)
        answer = build_grounded_answer(text, results)

        logged_text, redaction_count = redact(text)
        if redaction_count:
            get_telemetry_store(current_app.config["TELEMETRY_STORE_PATH"]).increment("redactions", redaction_count)

        audit_log.record(
            actor=user,
            action_type="chat_query",
            query_text=logged_text,
            summary=f"Policy question answered with {len(results)} citation(s)",
        )

        return jsonify({
            "type": "answer",
            "answer": answer,
            "citations": results,
        }), 200

    # --- Incident / request path ---
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

    audit_log.record(
        actor=user,
        action_type="ticket_submitted",
        category=ticket["category"],
        ticket_id=ticket["ticket_id"],
        summary=f"Submitted ticket {ticket['ticket_id']} ({ticket['category']}) via chat",
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

    # Ground the action script in the organisation's own matching policy clauses.
    copilot = get_copilot()
    policy_refs = copilot.query(ticket["clean_text"], top_k=2)
    action_script = generate_action_script(
        ticket["category"], ticket["mitre_tags"], ticket["ticket_id"], policy_refs=policy_refs
    )

    return jsonify({
        "type": "ticket",
        "ticket": ticket,
        "similar_past_resolutions": similar_resolutions,
        "action_script": action_script,
    }), 201
