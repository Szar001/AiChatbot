"""
Authentication API: login and current-session lookup.
"""
from flask import Blueprint, current_app, jsonify, request

from engine.auth import get_current_user, issue_token, login_required
from engine.user_store import ROLE_LABELS, get_user_store

auth_bp = Blueprint("auth_api", __name__, url_prefix="/api/v1/auth")


def _serialize_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "role_label": ROLE_LABELS.get(user["role"], user["role"]),
    }


@auth_bp.route("/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip()
    password = payload.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    store = get_user_store(current_app.config["USER_STORE_PATH"])
    user = store.authenticate(email, password)
    if user is None:
        return jsonify({"error": "Invalid email or password."}), 401

    token = issue_token(user["id"])
    return jsonify({"token": token, "user": _serialize_user(user)}), 200


@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    return jsonify({"user": _serialize_user(request.current_user)}), 200
