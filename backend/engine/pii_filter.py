"""
Privacy Filter: a fast, regex-based scrubber that sits between user input and
any permanent store (ticket store, audit log). It rewrites credit card
numbers, phone numbers, and raw password key-value pairs to [REDACTED]
before the text is ever persisted, so the SQLite/JSON logs stay audit-ready.
"""
import re

_CARD_RE = re.compile(r"\b(?:\d[ -]?){13,19}\b")
_PHONE_RE = re.compile(r"\b(?:\+?\d{1,3}[ -]?)?(?:\(\d{2,4}\)[ -]?)?\d{3}[ -]?\d{3,4}[ -]?\d{3,4}\b")
_PASSWORD_RE = re.compile(
    r"(?i)\b(password|pwd|passcode|pin)\s*[:=]\s*\S+"
)


def _luhn_valid(digits: str) -> bool:
    total = 0
    parity = len(digits) % 2
    for i, ch in enumerate(digits):
        d = int(ch)
        if i % 2 == parity:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def _redact_cards(text: str) -> str:
    def repl(match):
        digits = re.sub(r"[ -]", "", match.group(0))
        if len(digits) >= 13 and _luhn_valid(digits):
            return "[REDACTED]"
        return match.group(0)
    return _CARD_RE.sub(repl, text)


def redact(text: str) -> tuple[str, int]:
    """Returns (redacted_text, redaction_count)."""
    if not text:
        return text, 0

    count = 0
    working = _redact_cards(text)
    count += working.count("[REDACTED]")

    working, n = _PASSWORD_RE.subn(lambda m: f"{m.group(1)}: [REDACTED]", working)
    count += n

    working, n = _PHONE_RE.subn("[REDACTED]", working)
    count += n

    return working, count
