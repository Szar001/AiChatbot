"""
Chat orchestrator: decides what an incoming AI-chat message actually is, so the
desk can respond appropriately instead of treating everything as a ticket.

Two intents:
  * "question"  -> a policy / cybersecurity scenario question. The desk answers
                   it from the organisation's own RAG corpus and attaches the
                   raw source snippet it grounded the answer on.
  * "incident"  -> a request or active threat to be logged, categorised
                   (Attack Security / Defence / Governance) and, for active
                   threats, paired with a Technical Action Script.
"""
import re

# Words that strongly indicate the message is reporting/raising something to be
# actioned (a ticket), even when phrased as a statement.
INCIDENT_SIGNALS = [
    "we are experiencing", "we're experiencing", "we are under", "we're under",
    "experiencing a", "detected", "alert", "incident", "attack on", "attack against",
    "compromised", "breach", "breached", "ransomware", "infected", "ongoing",
    "please investigate", "please fix", "please resolve", "raise a ticket",
    "log a ticket", "happening now", "right now", "actively", "is down",
    "being attacked", "under attack", "suspicious activity", "we found",
    "we noticed", "i need you to", "can you fix", "can you resolve",
]

# Phrasing that indicates a policy/scenario question to be answered from RAG.
QUESTION_STARTERS = (
    "how", "what", "when", "where", "why", "which", "who", "can we", "could we",
    "should we", "are we", "is it", "do we", "does our", "am i", "may we",
    "is there", "what's", "whats", "under our", "according to",
)

QUESTION_SIGNALS = [
    "how long", "are we allowed", "are we permitted", "what is our policy",
    "what's our policy", "under our current", "is it compliant", "do we need to",
    "what does the policy", "are we required", "retention", "how should we",
    "what is the requirement", "is it permissible",
]


def classify_intent(text: str) -> str:
    """Returns 'question' or 'incident' for a raw chat message."""
    if not text or not text.strip():
        return "incident"

    lowered = text.lower().strip()

    # An explicit active-incident signal always wins, even if phrased as a question.
    for signal in INCIDENT_SIGNALS:
        if signal in lowered:
            return "incident"

    has_question_mark = "?" in lowered
    starts_interrogative = lowered.startswith(QUESTION_STARTERS)
    has_question_signal = any(sig in lowered for sig in QUESTION_SIGNALS)

    if has_question_mark or starts_interrogative or has_question_signal:
        return "question"

    return "incident"


def build_grounded_answer(question: str, results: list) -> str:
    """
    Composes a transparent, retrieval-grounded answer from the top RAG matches.
    No external model is used — the response is built strictly from the
    organisation's own policy/regulatory corpus, and the raw snippet is attached
    separately so the user can verify the source.
    """
    if not results:
        return (
            "I couldn't find anything in your organisation's policy library that "
            "directly addresses that. Consider uploading the relevant policy "
            "document in GRC Co-Pilot Management, or raise a request so the "
            "Governance team can advise."
        )

    top = results[0]
    answer = (
        f"Based on your organisation's policy library — specifically "
        f"{top['source']}, {top['clause']} — the applicable guidance is:\n\n"
        f"“{top['text']}”\n\n"
        "The exact source text is attached below so you can verify it directly."
    )

    if len(results) > 1:
        others = ", ".join(f"{r['source']} {r['clause']}" for r in results[1:3])
        answer += f"\n\nRelated provisions you may also want to review: {others}."

    return answer


def _significant_terms(text: str) -> set:
    return {w for w in re.findall(r"[a-z]{4,}", text.lower())}
