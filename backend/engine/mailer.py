"""
Mailer: sends the AI-drafted life document email back to a ticket requester
once a team member has approved the draft. Falls back to a log-only no-op
when SMTP isn't configured (dev/demo mode), so the approve-and-send flow
still works end-to-end without real mail credentials.
"""
import logging
import smtplib
from email.message import EmailMessage

logger = logging.getLogger("mailer")


def send_mail(config, to: str, subject: str, body: str) -> dict:
    if not config.get("SMTP_HOST"):
        logger.info("SMTP not configured; logging email instead of sending. To=%s Subject=%s", to, subject)
        return {"sent": False, "mode": "log-only", "to": to, "subject": subject}

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = config["SMTP_FROM"]
    msg["To"] = to
    msg.set_content(body)

    with smtplib.SMTP(config["SMTP_HOST"], config["SMTP_PORT"]) as server:
        server.starttls()
        if config.get("SMTP_USER"):
            server.login(config["SMTP_USER"], config["SMTP_PASSWORD"])
        server.send_message(msg)

    return {"sent": True, "mode": "smtp", "to": to, "subject": subject}


def draft_life_doc_email(ticket: dict, resolution_text: str) -> dict:
    """AI-drafted narrative built from the requester's own submission plus
    the reviewer's resolution notes, in plain language for the requester."""
    ticket_id = ticket.get("ticket_id", "")
    original_request = ticket.get("raw_text") or ticket.get("clean_text") or ""
    category = ticket.get("category", "your")

    subject = f"Update on your request {ticket_id} — Resolved"
    body = (
        f"Hello,\n\n"
        f"Thank you for reaching out about the following issue:\n"
        f"\"{original_request}\"\n\n"
        f"Our {category} team has reviewed and resolved this request. Here is a summary "
        f"of what was done:\n\n{resolution_text}\n\n"
        f"If you have any further questions about this resolution, please reply to this "
        f"email or submit a new request referencing {ticket_id}.\n\n"
        f"Regards,\nSterling Trust Bank GRC Desk"
    )
    return {"subject": subject, "body": body}
