"""
Global audit trail: every GRC query, ticket submission, and ticket resolution
is documented here so Service Desk Officers, Auditors, and the CISO can track
system activity, per the audit-tracking requirement on the Service Desk and
the "every query/request documented" requirement on the GRC Query Interface.
"""
import sqlite3
from datetime import datetime, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    actor_id TEXT,
    actor_name TEXT,
    actor_role TEXT,
    action_type TEXT NOT NULL,
    category TEXT,
    ticket_id TEXT,
    query_text TEXT,
    summary TEXT
);
"""


class AuditLogStore:
    def __init__(self, db_path: str):
        self.db_path = db_path
        conn = self._connect()
        try:
            conn.execute("ALTER TABLE audit_log ADD COLUMN actor_type TEXT")
            conn.commit()
        except sqlite3.OperationalError:
            pass
        conn.close()

    def _connect(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute(SCHEMA)
        conn.commit()
        return conn

    def record(self, actor: dict, action_type: str, summary: str,
               category: str = None, ticket_id: str = None, query_text: str = None,
               actor_type: str = "human") -> dict:
        timestamp = datetime.now(timezone.utc).isoformat()
        conn = self._connect()
        try:
            cursor = conn.execute(
                """
                INSERT INTO audit_log
                    (timestamp, actor_id, actor_name, actor_role, action_type, category, ticket_id, query_text, summary, actor_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (timestamp, actor.get("id"), actor.get("name"), actor.get("role"),
                 action_type, category, ticket_id, query_text, summary, actor_type),
            )
            conn.commit()
            record_id = cursor.lastrowid
        finally:
            conn.close()

        return {
            "id": record_id,
            "timestamp": timestamp,
            "actor_id": actor.get("id"),
            "actor_name": actor.get("name"),
            "actor_role": actor.get("role"),
            "action_type": action_type,
            "category": category,
            "ticket_id": ticket_id,
            "query_text": query_text,
            "summary": summary,
            "actor_type": actor_type,
        }

    def list_recent(self, limit: int = 50, action_type: str = None, actor_id: str = None) -> list:
        conn = self._connect()
        try:
            clauses = []
            params = []
            if action_type:
                clauses.append("action_type = ?")
                params.append(action_type)
            if actor_id:
                clauses.append("actor_id = ?")
                params.append(actor_id)
            where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            params.append(limit)
            rows = conn.execute(
                f"SELECT * FROM audit_log {where} ORDER BY id DESC LIMIT ?", params
            ).fetchall()
        finally:
            conn.close()
        return [dict(r) for r in rows]


_store_instance = None


def get_audit_log_store(db_path: str = None) -> AuditLogStore:
    global _store_instance
    if _store_instance is None:
        if db_path is None:
            raise ValueError("db_path required for first initialization")
        _store_instance = AuditLogStore(db_path)
    return _store_instance
