"""
SLA Configuration: per-urgency, per-staff-type response time limits, editable
from the User Management portal. Used to stamp a deadline on a ticket the
moment urgency is known, starting the SLA countdown clock automatically.
"""
import json
import os
import threading
from datetime import datetime, timedelta, timezone

_lock = threading.Lock()

DEFAULT_SLA_HOURS = {
    "internal": {"Critical": 4, "High": 24, "Medium": 72, "Low": 120},
    "external": {"Critical": 2, "High": 12, "Medium": 48, "Low": 96},
}


class SLAConfigStore:
    def __init__(self, store_path: str):
        self.store_path = store_path
        if not os.path.exists(self.store_path):
            self._write(dict(DEFAULT_SLA_HOURS))

    def _read(self) -> dict:
        if not os.path.exists(self.store_path):
            self._write(dict(DEFAULT_SLA_HOURS))
        with open(self.store_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        merged = {}
        for staff_type, defaults in DEFAULT_SLA_HOURS.items():
            merged[staff_type] = {**defaults, **data.get(staff_type, {})}
        return merged

    def _write(self, config: dict):
        with open(self.store_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)

    def get_config(self) -> dict:
        with _lock:
            return self._read()

    def set_hours(self, staff_type: str, urgency: str, hours: float) -> dict:
        with _lock:
            config = self._read()
            if staff_type not in config:
                config[staff_type] = {}
            config[staff_type][urgency] = float(hours)
            self._write(config)
            return config

    def compute_deadline(self, urgency: str, staff_type: str, created_at: str = None) -> str:
        config = self.get_config()
        hours = config.get(staff_type, config["internal"]).get(urgency, DEFAULT_SLA_HOURS["internal"]["Medium"])
        start = datetime.fromisoformat(created_at) if created_at else datetime.now(timezone.utc)
        return (start + timedelta(hours=hours)).isoformat()


_store_instance = None


def get_sla_config_store(store_path: str = None) -> SLAConfigStore:
    global _store_instance
    if _store_instance is None:
        if store_path is None:
            raise ValueError("store_path required for first initialization")
        _store_instance = SLAConfigStore(store_path)
    return _store_instance
