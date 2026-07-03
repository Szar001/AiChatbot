"""
Shared role/team scoping rules. Centralizes the mapping between a ticket's
classified category and the practitioner role/team allowed to see it, per
the access matrix: attack security can't see defense tickets and vice versa,
governance only sees governance tickets, service desk officers and the CISO
see everything.
"""

CATEGORY_TO_ROLE = {
    "Governance": "governance",
    "Attack Security": "attack_security",
    "Defence": "defense",
}

PRACTITIONER_ROLES = {"governance", "attack_security", "defense"}
FULL_VISIBILITY_ROLES = {"service_desk_officer", "ciso"}


def can_view_ticket(user: dict, ticket: dict) -> bool:
    role = user["role"]
    if role in FULL_VISIBILITY_ROLES:
        return True
    if role == "user":
        return ticket.get("submitted_by_id") == user["id"]
    if role in PRACTITIONER_ROLES:
        return CATEGORY_TO_ROLE.get(ticket.get("category")) == role
    return False


def filter_visible_tickets(user: dict, tickets: list) -> list:
    return [t for t in tickets if can_view_ticket(user, t)]
