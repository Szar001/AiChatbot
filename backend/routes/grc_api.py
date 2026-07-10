"""
GRC Co-Pilot API: handles policy document uploads (Local Storage) and
natural-language audit queries against the RAG retrieval engine.
"""
import os
import uuid
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, request
from werkzeug.utils import secure_filename

from engine.audit_log import get_audit_log_store
from engine.auth import roles_required
from engine.policy_store import get_policy_store
from engine.rag_copilot import extract_text_from_upload, get_copilot

grc_bp = Blueprint("grc_api", __name__, url_prefix="/api/v1")


def _allowed_file(filename: str, allowed_extensions: set) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions


@grc_bp.route("/upload-policy", methods=["POST"])
@roles_required("governance", "ciso")
def upload_policy():
    if "file" not in request.files:
        return jsonify({"error": "No file part named 'file' in the request."}), 400

    uploaded_file = request.files["file"]
    if uploaded_file.filename == "":
        return jsonify({"error": "No file selected for upload."}), 400

    allowed_extensions = current_app.config["ALLOWED_UPLOAD_EXTENSIONS"]
    if not _allowed_file(uploaded_file.filename, allowed_extensions):
        return jsonify({"error": f"Unsupported file type. Allowed: {sorted(allowed_extensions)}"}), 400

    is_test_data = (request.form.get("is_test_data") or "").lower() in ("1", "true", "yes")

    safe_name = secure_filename(uploaded_file.filename)
    unique_name = f"{uuid.uuid4().hex[:8]}_{safe_name}"
    save_path = os.path.join(current_app.config["UPLOAD_FOLDER"], unique_name)
    uploaded_file.save(save_path)

    policy_store = get_policy_store(current_app.config["POLICY_STORE_PATH"])
    uploaded_at = datetime.now(timezone.utc).isoformat()
    record = {
        "filename": safe_name,
        "stored_as": unique_name,
        "type": "Uploaded Policy",
        "uploaded_at": uploaded_at,
        "status": "Processing",
        "extracted_characters": 0,
        "is_test_data": is_test_data,
    }
    policy_store.add(record)

    try:
        extracted_text = extract_text_from_upload(save_path)
    except Exception as exc:
        policy_store.update(unique_name, {"status": "Failed", "error": str(exc)})
        return jsonify({
            "error": f"File saved but text extraction failed: {exc}",
            "filename": safe_name,
            "status": "Failed",
        }), 500

    copilot = get_copilot()
    copilot.register_uploaded_policy(safe_name, extracted_text, is_test_data=is_test_data)

    policy_store.update(unique_name, {
        "status": "Processed",
        "extracted_characters": len(extracted_text),
    })

    return jsonify({
        "filename": safe_name,
        "stored_as": unique_name,
        "status": "Processed",
        "extracted_characters": len(extracted_text),
        "uploaded_at": uploaded_at,
        "is_test_data": is_test_data,
    }), 201


@grc_bp.route("/policies", methods=["GET"])
@roles_required("governance", "ciso")
def list_policies():
    policy_store = get_policy_store(current_app.config["POLICY_STORE_PATH"])
    policies = list(reversed(policy_store.list_all()))
    return jsonify({"policies": policies, "count": len(policies)}), 200


@grc_bp.route("/grc-query", methods=["POST"])
@roles_required("auditor", "governance", "ciso")
def grc_query():
    payload = request.get_json(silent=True) or {}
    query_text = (payload.get("query") or "").strip()
    framework = payload.get("framework", "all")

    if not query_text:
        return jsonify({"error": "Field 'query' is required and cannot be empty."}), 400

    copilot = get_copilot()
    results = copilot.query(query_text, framework=framework)

    audit_log = get_audit_log_store(current_app.config["AUDIT_LOG_DB_PATH"])
    audit_log.record(
        actor=request.current_user,
        action_type="grc_query",
        query_text=query_text,
        summary=f"{len(results)} result(s) for query in framework '{framework}'",
    )

    return jsonify({
        "query": query_text,
        "framework": framework,
        "result_count": len(results),
        "results": results,
    }), 200


@grc_bp.route("/grc-gaps", methods=["GET"])
@roles_required("governance", "ciso")
def grc_gaps():
    """
    AI-detected framework/policy/compliance gaps: baseline NDPA/CBN clauses
    that no uploaded policy document adequately covers yet.
    """
    copilot = get_copilot()
    gaps = copilot.detect_gaps()
    uncovered = [g for g in gaps if not g["covered"]]
    return jsonify({
        "gaps": gaps,
        "uncovered_count": len(uncovered),
        "covered_count": len(gaps) - len(uncovered),
        "total_clauses": len(gaps),
    }), 200


@grc_bp.route("/compliance-scoreboard", methods=["GET"])
@roles_required("governance", "ciso", "auditor")
def compliance_scoreboard():
    """
    Compliance Scoreboard: rolls up AI-detected coverage of baseline NDPA/CBN
    clauses (excluding any test/fake policies) into a single score, so
    uploading a real policy document moves the scoreboard rather than the
    gap list alone.
    """
    copilot = get_copilot()
    score = copilot.compliance_score()
    return jsonify({"scoreboard": score}), 200


@grc_bp.route("/grc-query/history", methods=["GET"])
@roles_required("auditor", "governance", "ciso")
def grc_query_history():
    """
    The current user's last 5 audit queries, shown in the side panel of the
    GRC Co-Pilot Query Interface so an auditor can revisit recent searches.
    """
    audit_log = get_audit_log_store(current_app.config["AUDIT_LOG_DB_PATH"])
    records = audit_log.list_recent(
        limit=5, action_type="grc_query", actor_id=request.current_user["id"]
    )
    return jsonify({"history": records, "count": len(records)}), 200
