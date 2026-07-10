"""
Automated Triage: infers the specific incident type and urgency from raw
ticket text so the desk can auto-tag the stream, set urgency, and start the
SLA countdown before a human reviewer looks at it.
"""
import re

# Ordered: first matching rule wins. Each rule is
# (keywords, incident_type, stream_override, urgency).
INCIDENT_RULES = [
    (
        ["locked", "weird extension", "ransom", "encrypted", ".encrypted", "decrypt"],
        "Ransomware", "Defence", "Critical",
    ),
    (
        ["ddos", "denial of service", "traffic spike", "flood"],
        "Denial of Service", "Defence", "Critical",
    ),
    (
        ["brute force", "credential stuffing", "repeated failed login"],
        "Brute Force Attack", "Attack Security", "High",
    ),
    (
        ["phishing", "credential harvesting", "suspicious link", "suspicious attachment"],
        "Phishing", "Attack Security", "High",
    ),
    (
        ["data breach", "exfiltrat", "unauthorized access", "leaked"],
        "Data Breach", "Attack Security", "Critical",
    ),
    (
        ["malware", "virus", "trojan", "beaconing"],
        "Malware", "Defence", "High",
    ),
]

DEFAULT_URGENCY = "Medium"


def infer_incident(text: str, classifier_label: str = None) -> dict:
    lowered = (text or "").lower()
    for keywords, incident_type, stream, urgency in INCIDENT_RULES:
        if any(kw in lowered for kw in keywords):
            return {
                "incident_type": incident_type,
                "stream": stream,
                "urgency": urgency,
            }

    stream = classifier_label if classifier_label in ("Attack Security", "Defence") else "Governance"
    urgency = "Low" if stream == "Governance" else DEFAULT_URGENCY
    return {
        "incident_type": None,
        "stream": stream,
        "urgency": urgency,
    }
