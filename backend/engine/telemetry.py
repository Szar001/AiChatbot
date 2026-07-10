"""
Compliance Telemetry: a running tally of privacy-filter redactions, user
access log entries, and stakeholder boundary checks, so a single click can
compile it into a formal compliance report for examiners.
"""
import json
import os
import threading
from datetime import datetime, timezone

_lock = threading.Lock()

DEFAULT_COUNTERS = {
    "redactions": 0,
    "access_checks": 0,
    "boundary_checks": 0,
    "since": None,
}


class TelemetryStore:
    def __init__(self, store_path: str):
        self.store_path = store_path
        if not os.path.exists(self.store_path):
            counters = dict(DEFAULT_COUNTERS)
            counters["since"] = datetime.now(timezone.utc).isoformat()
            self._write(counters)

    def _read(self) -> dict:
        if not os.path.exists(self.store_path):
            counters = dict(DEFAULT_COUNTERS)
            counters["since"] = datetime.now(timezone.utc).isoformat()
            self._write(counters)
        with open(self.store_path, "r", encoding="utf-8") as f:
            return {**DEFAULT_COUNTERS, **json.load(f)}

    def _write(self, counters: dict):
        with open(self.store_path, "w", encoding="utf-8") as f:
            json.dump(counters, f, indent=2)

    def increment(self, field: str, by: int = 1):
        if by <= 0:
            return
        with _lock:
            counters = self._read()
            counters[field] = counters.get(field, 0) + by
            self._write(counters)

    def snapshot(self) -> dict:
        with _lock:
            return self._read()


_store_instance = None


def get_telemetry_store(store_path: str = None) -> TelemetryStore:
    global _store_instance
    if _store_instance is None:
        if store_path is None:
            raise ValueError("store_path required for first initialization")
        _store_instance = TelemetryStore(store_path)
    return _store_instance
