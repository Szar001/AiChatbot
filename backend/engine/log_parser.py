"""
LogParser: ingests raw ticket/log text submitted by the client and normalizes
it into a standardized structure consumed downstream by the ForensicAnalyzer-
style ticket classifier and RAG co-pilot.
"""
import re
import uuid
from datetime import datetime, timezone

import pandas as pd

IP_PATTERN = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
WHITESPACE_PATTERN = re.compile(r"\s+")
CVE_PATTERN = re.compile(r"\bCVE-\d{4}-\d{4,7}\b", re.IGNORECASE)

MITRE_KEYWORDS = {
    "phishing": "T1566 - Phishing",
    "malware": "T1204 - User Execution",
    "ransomware": "T1486 - Data Encrypted for Impact",
    "sql injection": "T1190 - Exploit Public-Facing Application",
    "brute force": "T1110 - Brute Force",
    "privilege escalation": "T1068 - Exploitation for Privilege Escalation",
    "credential": "T1552 - Unsecured Credentials",
    "lateral movement": "T1021 - Remote Services",
    "exfiltration": "T1041 - Exfiltration Over C2 Channel",
    "denial of service": "T1498 - Network Denial of Service",
    "ddos": "T1498 - Network Denial of Service",
    "firewall": "T1562 - Impair Defenses",
    "unauthorized access": "T1078 - Valid Accounts",
    "social engineering": "T1566 - Phishing",
    "data breach": "T1530 - Data from Cloud Storage Object",
}


def clean_text(raw_text: str) -> str:
    if not raw_text:
        return ""
    text = raw_text.strip()
    text = WHITESPACE_PATTERN.sub(" ", text)
    return text


def extract_entities(raw_text: str) -> dict:
    return {
        "ip_addresses": sorted(set(IP_PATTERN.findall(raw_text))),
        "emails": sorted(set(EMAIL_PATTERN.findall(raw_text))),
        "cves": sorted(set(m.upper() for m in CVE_PATTERN.findall(raw_text))),
    }


def extract_mitre_tags(raw_text: str) -> list:
    lowered = raw_text.lower()
    tags = [label for keyword, label in MITRE_KEYWORDS.items() if keyword in lowered]
    return sorted(set(tags))


def parse_ticket(raw_text: str, submitted_by: str = "anonymous") -> dict:
    """
    Standardizes an incoming ticket payload into the structure consumed by
    ticket_classifier.py and life_doc.py.
    """
    cleaned = clean_text(raw_text)
    entities = extract_entities(raw_text)
    mitre_tags = extract_mitre_tags(raw_text)

    record = {
        "ticket_id": f"REQ-{uuid.uuid4().hex[:8].upper()}",
        "raw_text": raw_text,
        "clean_text": cleaned,
        "submitted_by": submitted_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "entities": entities,
        "mitre_tags": mitre_tags,
        "word_count": len(cleaned.split()),
    }
    return record


def parse_log_batch(records: list) -> pd.DataFrame:
    """
    Ingests a batch of raw log/ticket dicts (each with at least a 'text' key)
    and returns a cleaned, standardized pandas DataFrame for bulk analysis.
    """
    parsed = [parse_ticket(r.get("text", ""), r.get("submitted_by", "anonymous")) for r in records]
    df = pd.DataFrame(parsed)
    if not df.empty:
        df["created_at"] = pd.to_datetime(df["created_at"])
    return df
