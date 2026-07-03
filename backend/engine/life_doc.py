"""
Life Document module: a dynamic knowledge base layer. When a human reviewer
approves a ticket resolution, the technical details are captured, tagged with
MITRE ATT&CK concepts, and persisted to SQLite so future matching incidents
can be resolved without duplicate manual effort.
"""
import json
import sqlite3
from datetime import datetime, timezone

from .log_parser import extract_mitre_tags

SCHEMA = """
CREATE TABLE IF NOT EXISTS life_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT NOT NULL,
    ticket_title TEXT,
    category TEXT,
    resolution_text TEXT NOT NULL,
    mitre_tags TEXT,
    reviewer TEXT,
    approved_at TEXT NOT NULL
);
"""


class LifeDocumentStore:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_schema()

    def _connect(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute(SCHEMA)
        conn.commit()
        return conn

    def _init_schema(self):
        conn = self._connect()
        conn.close()

    def append_resolution(self, ticket_id: str, resolution_text: str,
                           ticket_title: str = "", category: str = "",
                           reviewer: str = "unknown") -> dict:
        mitre_tags = extract_mitre_tags(resolution_text)
        approved_at = datetime.now(timezone.utc).isoformat()

        conn = self._connect()
        try:
            cursor = conn.execute(
                """
                INSERT INTO life_documents
                    (ticket_id, ticket_title, category, resolution_text, mitre_tags, reviewer, approved_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (ticket_id, ticket_title, category, resolution_text,
                 json.dumps(mitre_tags), reviewer, approved_at),
            )
            conn.commit()
            record_id = cursor.lastrowid
        finally:
            conn.close()

        return {
            "id": record_id,
            "ticket_id": ticket_id,
            "ticket_title": ticket_title,
            "category": category,
            "resolution_text": resolution_text,
            "mitre_tags": mitre_tags,
            "reviewer": reviewer,
            "approved_at": approved_at,
        }

    def find_similar(self, ticket_text: str, limit: int = 5) -> list:
        """Keyword overlap search to surface prior resolutions for a new incident."""
        keywords = {w.lower() for w in ticket_text.split() if len(w) > 4}
        if not keywords:
            return []

        conn = self._connect()
        try:
            rows = conn.execute("SELECT * FROM life_documents ORDER BY id DESC").fetchall()
        finally:
            conn.close()

        scored = []
        for row in rows:
            haystack = f"{row['ticket_title']} {row['resolution_text']}".lower()
            overlap = sum(1 for kw in keywords if kw in haystack)
            if overlap > 0:
                scored.append((overlap, self._row_to_dict(row)))

        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [item for _, item in scored[:limit]]

    def get_by_ticket_id(self, ticket_id: str) -> dict | None:
        conn = self._connect()
        try:
            row = conn.execute(
                "SELECT * FROM life_documents WHERE ticket_id = ? ORDER BY id DESC LIMIT 1",
                (ticket_id,),
            ).fetchone()
        finally:
            conn.close()
        return self._row_to_dict(row) if row else None

    def list_all(self, limit: int = 100) -> list:
        conn = self._connect()
        try:
            rows = conn.execute(
                "SELECT * FROM life_documents ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
        finally:
            conn.close()
        return [self._row_to_dict(r) for r in rows]

    @staticmethod
    def _row_to_dict(row: sqlite3.Row) -> dict:
        return {
            "id": row["id"],
            "ticket_id": row["ticket_id"],
            "ticket_title": row["ticket_title"],
            "category": row["category"],
            "resolution_text": row["resolution_text"],
            "mitre_tags": json.loads(row["mitre_tags"] or "[]"),
            "reviewer": row["reviewer"],
            "approved_at": row["approved_at"],
        }


_store_instance = None


def get_life_doc_store(db_path: str = None) -> LifeDocumentStore:
    global _store_instance
    if _store_instance is None:
        if db_path is None:
            raise ValueError("db_path required for first initialization")
        _store_instance = LifeDocumentStore(db_path)
    return _store_instance
