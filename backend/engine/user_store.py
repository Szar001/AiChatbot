"""
User store and authentication. Seeds one demo account per role so every
page-access and team-scoping rule in the spec can be exercised immediately.

Roles: user, service_desk_officer, governance, defense, attack_security,
auditor, ciso.
"""
import json
import os
import threading

from werkzeug.security import check_password_hash, generate_password_hash

_lock = threading.Lock()

DEMO_PASSWORD = "password123"

SEED_USERS = [
    {"id": "u1", "name": "John Doe", "email": "user@sterlingtrust.com", "role": "user"},
    {"id": "u2", "name": "Funmi Bello", "email": "servicedesk@sterlingtrust.com", "role": "service_desk_officer"},
    {"id": "u3", "name": "Michael Torres", "email": "governance@sterlingtrust.com", "role": "governance"},
    {"id": "u4", "name": "Emma Wilson", "email": "defense@sterlingtrust.com", "role": "defense"},
    {"id": "u5", "name": "Sarah Chen", "email": "attack@sterlingtrust.com", "role": "attack_security"},
    {"id": "u6", "name": "David Okafor", "email": "auditor@sterlingtrust.com", "role": "auditor"},
    {"id": "u7", "name": "Lawal Tumininu", "email": "ciso@sterlingtrust.com", "role": "ciso"},
]

ROLE_LABELS = {
    "user": "User",
    "service_desk_officer": "Service Desk Officer",
    "governance": "Governance",
    "defense": "Defence",
    "attack_security": "Attack Security",
    "auditor": "Auditor",
    "ciso": "CISO",
}


class UserStore:
    def __init__(self, store_path: str):
        self.store_path = store_path
        if not os.path.exists(self.store_path):
            seeded = [
                {**u, "is_internal": True, "password_hash": generate_password_hash(DEMO_PASSWORD)}
                for u in SEED_USERS
            ]
            self._write_all(seeded)

    def _read_all(self) -> list:
        with open(self.store_path, "r", encoding="utf-8") as f:
            users = json.load(f)
        for u in users:
            u.setdefault("is_internal", True)
        return users

    def _write_all(self, users: list):
        with open(self.store_path, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2, default=str)

    def authenticate(self, email: str, password: str) -> dict | None:
        with _lock:
            users = self._read_all()
        for u in users:
            if u["email"].lower() == email.lower() and check_password_hash(u["password_hash"], password):
                return {k: v for k, v in u.items() if k != "password_hash"}
        return None

    def get_by_id(self, user_id: str) -> dict | None:
        with _lock:
            users = self._read_all()
        for u in users:
            if u["id"] == user_id:
                return {k: v for k, v in u.items() if k != "password_hash"}
        return None

    def list_all(self) -> list:
        with _lock:
            users = self._read_all()
        return [{k: v for k, v in u.items() if k != "password_hash"} for u in users]

    def update(self, user_id: str, updates: dict) -> dict | None:
        with _lock:
            users = self._read_all()
            found = None
            for u in users:
                if u["id"] == user_id:
                    if "is_internal" in updates:
                        u["is_internal"] = bool(updates["is_internal"])
                    found = u
                    break
            if found is None:
                return None
            self._write_all(users)
        return {k: v for k, v in found.items() if k != "password_hash"}


_store_instance = None


def get_user_store(store_path: str = None) -> UserStore:
    global _store_instance
    if _store_instance is None:
        if store_path is None:
            raise ValueError("store_path required for first initialization")
        _store_instance = UserStore(store_path)
    return _store_instance
