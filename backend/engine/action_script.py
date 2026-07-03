"""
Technical Action Script generator: for tickets classified into an active-threat
category (Attack Security or Defence) the desk auto-drafts a first-response
runbook the assigned team can execute immediately, keyed off the MITRE ATT&CK
tags detected in the ticket text.
"""

ACTIVE_THREAT_CATEGORIES = {"Attack Security", "Defence"}

TAG_PLAYBOOKS = {
    "T1566 - Phishing": [
        "Quarantine the reported email/message across all mailboxes that received it.",
        "Block the sender domain/IP at the mail gateway and web proxy.",
        "Force a password reset for any user who clicked the link or opened the attachment.",
        "Search mail logs for other recipients of the same campaign.",
    ],
    "T1204 - User Execution": [
        "Isolate the affected endpoint from the network.",
        "Run a full AV/EDR scan and capture a memory image before remediation.",
        "Identify the executed file's hash and block it across the EDR fleet.",
    ],
    "T1486 - Data Encrypted for Impact": [
        "Disconnect affected hosts from the network immediately to stop encryption spread.",
        "Identify and isolate the patient-zero host.",
        "Verify last-known-good backups before any restoration attempt.",
        "Do not pay or negotiate; escalate to CISO and legal per incident response policy.",
    ],
    "T1190 - Exploit Public-Facing Application": [
        "Apply the relevant vendor patch or WAF rule to close the exploited vector.",
        "Review web server/application logs for the exploitation timeframe.",
        "Rotate any credentials or tokens potentially exposed by the application.",
    ],
    "T1110 - Brute Force": [
        "Lock or force-reset the targeted account(s).",
        "Block the source IP(s) at the firewall/WAF.",
        "Enable or verify MFA is enforced on the targeted account(s).",
    ],
    "T1068 - Exploitation for Privilege Escalation": [
        "Revoke the elevated session/token immediately.",
        "Audit recently modified group memberships and admin accounts.",
        "Patch the privilege-escalation vector once identified.",
    ],
    "T1552 - Unsecured Credentials": [
        "Rotate the exposed credential(s) immediately.",
        "Search code repositories, configs, and logs for other instances of the same secret.",
        "Enforce secret-scanning on the relevant repository/pipeline going forward.",
    ],
    "T1021 - Remote Services": [
        "Disable the remote access account/service used for lateral movement.",
        "Review authentication logs for all hosts reached via the same credential.",
        "Segment the affected network zone pending full investigation.",
    ],
    "T1041 - Exfiltration Over C2 Channel": [
        "Block the destination IP/domain at the firewall and proxy.",
        "Capture network flow logs for the exfiltration window for forensics.",
        "Identify and isolate the host(s) that initiated the outbound transfer.",
    ],
    "T1498 - Network Denial of Service": [
        "Engage upstream ISP/CDN DDoS mitigation if traffic exceeds local capacity.",
        "Apply rate-limiting and block offending source ranges at the edge.",
        "Confirm critical services failover correctly under the attack load.",
    ],
    "T1562 - Impair Defenses": [
        "Verify security tooling (AV/EDR/firewall) has not been disabled or tampered with.",
        "Restore any disabled security controls and alert on further tampering attempts.",
        "Audit who had access to disable the control and when.",
    ],
    "T1078 - Valid Accounts": [
        "Disable the compromised account pending investigation.",
        "Review the account's recent activity for unauthorized actions.",
        "Force MFA re-enrollment before re-enabling the account.",
    ],
    "T1530 - Data from Cloud Storage Object": [
        "Revoke the access credentials/tokens used to reach the storage object.",
        "Review bucket/storage access logs for the scope of data accessed.",
        "Tighten storage access policies to least-privilege.",
    ],
}

DEFAULT_PLAYBOOK = [
    "Acknowledge the ticket and assign an incident owner.",
    "Gather logs and evidence relevant to the reported activity.",
    "Contain the affected asset(s) pending root-cause analysis.",
    "Escalate to the CISO if scope grows beyond the initial assessment.",
]


def generate_action_script(category: str, mitre_tags: list, ticket_id: str,
                           policy_refs: list = None) -> dict | None:
    """Returns a Technical Action Script for active-threat categories, or None
    for tickets that don't warrant one (e.g. Governance/compliance requests).

    `policy_refs` are the organisation's own matching policy/regulatory clauses
    (from the RAG corpus), so the runbook is grounded in company network
    guidelines rather than being generic boilerplate.
    """
    if category not in ACTIVE_THREAT_CATEGORIES:
        return None

    steps = []
    for tag in mitre_tags:
        for step in TAG_PLAYBOOKS.get(tag, []):
            if step not in steps:
                steps.append(step)
    if not steps:
        steps = DEFAULT_PLAYBOOK

    return {
        "ticket_id": ticket_id,
        "title": f"Technical Action Script — {ticket_id}",
        "mitre_tags": mitre_tags,
        "steps": steps,
        "policy_basis": policy_refs or [],
    }
