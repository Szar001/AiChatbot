"""
SLA Configuration API: lets Service Desk Officers / CISO pre-define SLA time
limits per urgency for internal and external staff, and mark a user as
internal or external.
"""
from flask import Blueprint, current_app, jsonify, request

from engine.auth import roles_required
from engine.sla_config import get_sla_config_store
from engine.user_store import ROLE_LABELS, get_user_store

sla_bp = Blueprint("sla_api", __name__, url_prefix="/api/v1")

CONFIG_ROLES = ("service_desk_officer", "ciso")


@sla_bp.route("/sla-config", methods=["GET"])
@roles_required(*CONFIG_ROLES)
def get_sla_config():
    store = get_sla_config_store(current_app.config["SLA_CONFIG_STORE_PATH"])
    return jsonify({"sla_config": store.get_config()}), 200


@sla_bp.route("/sla-config", methods=["POST"])
@roles_required(*CONFIG_ROLES)
def set_sla_config():
    payload = request.get_json(silent=True) or {}
    staff_type = payload.get("staff_type")
    urgency = payload.get("urgency")
    hours = payload.get("hours")

    if staff_type not in ("internal", "external") or not urgency or hours is None:
        return jsonify({"error": "Fields 'staff_type' (internal/external), 'urgency', 'hours' are required."}), 400
    try:
        hours = float(hours)
    except (TypeError, ValueError):
        return jsonify({"error": "Field 'hours' must be a number."}), 400

    store = get_sla_config_store(current_app.config["SLA_CONFIG_STORE_PATH"])
    config = store.set_hours(staff_type, urgency, hours)
    return jsonify({"sla_config": config}), 200


@sla_bp.route("/users", methods=["GET"])
@roles_required(*CONFIG_ROLES)
def list_users():
    store = get_user_store(current_app.config["USER_STORE_PATH"])
    users = store.list_all()
    for u in users:
        u["role_label"] = ROLE_LABELS.get(u["role"], u["role"])
    return jsonify({"users": users, "count": len(users)}), 200


@sla_bp.route("/users/<user_id>", methods=["PATCH"])
@roles_required("ciso")
def update_user(user_id):
    payload = request.get_json(silent=True) or {}
    if "is_internal" not in payload:
        return jsonify({"error": "Field 'is_internal' is required."}), 400

    store = get_user_store(current_app.config["USER_STORE_PATH"])
    updated = store.update(user_id, {"is_internal": payload["is_internal"]})
    if updated is None:
        return jsonify({"error": f"User {user_id} not found."}), 404
    return jsonify({"user": updated}), 200
