"""
Lightweight JSON-backed registry of uploaded policy documents, so the
GRC Management UI can show real upload history instead of placeholder data.
"""
import json
import os
import threading

_lock = threading.Lock()


class PolicyStore:
    def __init__(self, store_path: str):
        self.store_path = store_path
        if not os.path.exists(self.store_path):
            self._write_all([])

    def _read_all(self) -> list:
        if not os.path.exists(self.store_path):
            self._write_all([])
        with open(self.store_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_all(self, policies: list):
        with open(self.store_path, "w", encoding="utf-8") as f:
            json.dump(policies, f, indent=2, default=str)

    def add(self, policy: dict) -> dict:
        with _lock:
            policies = self._read_all()
            policies.append(policy)
            self._write_all(policies)
        return policy

    def update(self, stored_as: str, updates: dict) -> dict | None:
        with _lock:
            policies = self._read_all()
            updated = None
            for p in policies:
                if p.get("stored_as") == stored_as:
                    p.update(updates)
                    updated = p
                    break
            if updated is not None:
                self._write_all(policies)
        return updated

    def list_all(self) -> list:
        with _lock:
            return self._read_all()


_store_instance = None


def get_policy_store(store_path: str = None) -> PolicyStore:
    global _store_instance
    if _store_instance is None:
        if store_path is None:
            raise ValueError("store_path required for first initialization")
        _store_instance = PolicyStore(store_path)
    return _store_instance
