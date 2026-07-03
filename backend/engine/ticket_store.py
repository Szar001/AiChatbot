"""
Lightweight JSON-backed ticket repository. Tickets flow:
Upload/Submit -> classified -> stored here -> picked up by service teams ->
resolved -> approved -> appended to the Life Document store.
"""
import json
import os
import threading

_lock = threading.Lock()


class TicketStore:
    def __init__(self, store_path: str):
        self.store_path = store_path
        if not os.path.exists(self.store_path):
            self._write_all([])

    def _read_all(self) -> list:
        if not os.path.exists(self.store_path):
            self._write_all([])
        with open(self.store_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_all(self, tickets: list):
        with open(self.store_path, "w", encoding="utf-8") as f:
            json.dump(tickets, f, indent=2, default=str)

    def add(self, ticket: dict) -> dict:
        with _lock:
            tickets = self._read_all()
            tickets.append(ticket)
            self._write_all(tickets)
        return ticket

    def list_all(self) -> list:
        with _lock:
            return self._read_all()

    def get(self, ticket_id: str) -> dict | None:
        with _lock:
            tickets = self._read_all()
        for t in tickets:
            if t.get("ticket_id") == ticket_id:
                return t
        return None

    def update(self, ticket_id: str, updates: dict) -> dict | None:
        with _lock:
            tickets = self._read_all()
            updated = None
            for t in tickets:
                if t.get("ticket_id") == ticket_id:
                    t.update(updates)
                    updated = t
                    break
            if updated is not None:
                self._write_all(tickets)
        return updated

    def append_to_list(self, ticket_id: str, field: str, item: dict) -> dict | None:
        """Appends an entry to a list field on a ticket (e.g. triage_footprint, nudges)."""
        with _lock:
            tickets = self._read_all()
            updated = None
            for t in tickets:
                if t.get("ticket_id") == ticket_id:
                    t.setdefault(field, []).append(item)
                    updated = t
                    break
            if updated is not None:
                self._write_all(tickets)
        return updated


_store_instance = None


def get_ticket_store(store_path: str = None) -> TicketStore:
    global _store_instance
    if _store_instance is None:
        if store_path is None:
            raise ValueError("store_path required for first initialization")
        _store_instance = TicketStore(store_path)
    return _store_instance
