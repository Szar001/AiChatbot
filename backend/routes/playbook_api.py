"""
Exploit Playbook Repository API: browse past vulnerabilities auto-seeded
from resolved active-threat tickets, and toggle each entry Patched/Active.
"""
from flask import Blueprint, current_app, jsonify, request

from engine.auth import roles_required
from engine.exploit_playbook import get_exploit_playbook_store

playbook_bp = Blueprint("playbook_api", __name__, url_prefix="/api/v1")

VIEW_ROLES = ("attack_security", "defense", "ciso", "auditor")


@playbook_bp.route("/exploit-playbook", methods=["GET"])
@roles_required(*VIEW_ROLES)
def list_playbook():
    store = get_exploit_playbook_store(current_app.config["EXPLOIT_PLAYBOOK_DB_PATH"])
    entries = store.list_all()
    return jsonify({"entries": entries, "count": len(entries)}), 200


@playbook_bp.route("/exploit-playbook/<int:entry_id>", methods=["PATCH"])
@roles_required("attack_security", "defense", "ciso")
def update_playbook_entry(entry_id):
    payload = request.get_json(silent=True) or {}
    status = payload.get("status")
    if status not in ("Active", "Patched"):
        return jsonify({"error": "Field 'status' must be 'Active' or 'Patched'."}), 400

    store = get_exploit_playbook_store(current_app.config["EXPLOIT_PLAYBOOK_DB_PATH"])
    updated = store.set_status(entry_id, status)
    if updated is None:
        return jsonify({"error": f"Playbook entry {entry_id} not found."}), 404
    return jsonify({"entry": updated}), 200
