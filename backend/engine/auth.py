"""
Lightweight signed-token auth. Tokens are itsdangerous-signed payloads
carrying the user id, decoded on every request via the Authorization header.
No external session store or DB is required for this prototype scale.
"""
from functools import wraps

from flask import current_app, jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from .user_store import get_user_store

TOKEN_MAX_AGE_SECONDS = 60 * 60 * 12  # 12 hours


def _serializer():
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="auth-token")


def issue_token(user_id: str) -> str:
    return _serializer().dumps({"user_id": user_id})


def decode_token(token: str) -> dict | None:
    try:
        return _serializer().loads(token, max_age=TOKEN_MAX_AGE_SECONDS)
    except (BadSignature, SignatureExpired):
        return None


def get_current_user() -> dict | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer "):]
    payload = decode_token(token)
    if not payload:
        return None
    store = get_user_store(current_app.config["USER_STORE_PATH"])
    return store.get_by_id(payload["user_id"])


def login_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        user = get_current_user()
        if user is None:
            return jsonify({"error": "Authentication required."}), 401
        request.current_user = user
        return view_func(*args, **kwargs)
    return wrapper


def roles_required(*allowed_roles):
    def decorator(view_func):
        @wraps(view_func)
        @login_required
        def wrapper(*args, **kwargs):
            if request.current_user["role"] not in allowed_roles:
                return jsonify({"error": "You do not have permission to perform this action."}), 403
            return view_func(*args, **kwargs)
        return wrapper
    return decorator
