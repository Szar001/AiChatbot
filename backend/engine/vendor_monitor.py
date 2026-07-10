"""
Vendor & Licence Monitoring module: tracks security-licence renewal dates,
budget thresholds, and SLA breaches, and drafts vendor communication
templates when action is required.
"""
import json
import os
import threading
import uuid
from datetime import datetime, date, timedelta, timezone

_lock = threading.Lock()

SEED_VENDORS = [
    {
        "vendor_id": "VEN-001",
        "name": "Firewall License",
        "vendor_name": "Fortinet",
        "expiry_date": "2026-07-10",
        "annual_cost": 18000.0,
        "sla_breaches": 0,
    },
    {
        "vendor_id": "VEN-002",
        "name": "SIEM Platform",
        "vendor_name": "Splunk",
        "expiry_date": "2026-08-12",
        "annual_cost": 65000.0,
        "sla_breaches": 1,
    },
    {
        "vendor_id": "VEN-003",
        "name": "EDR Solution",
        "vendor_name": "CrowdStrike",
        "expiry_date": "2026-10-26",
        "annual_cost": 42000.0,
        "sla_breaches": 0,
    },
    {
        "vendor_id": "VEN-004",
        "name": "WAF License",
        "vendor_name": "Cloudflare",
        "expiry_date": "2026-07-06",
        "annual_cost": 12000.0,
        "sla_breaches": 2,
    },
]

# Default budget shipped before a Service Desk Officer sets one. It is inactive
# and has no expiry date until it is explicitly set/activated from the UI.
DEFAULT_BUDGET = {
    "total": 200000.0,
    "spent": 124500.0,
    "expiry_date": None,
    "active": False,
    # Length of the budget period in days, captured when the budget is set, so
    # "Renew" can reset the countdown to a fresh full term.
    "term_days": None,
    # Individual budget line items so "spent" is broken down by what the money
    # was actually for (License Tracking, Food, Cybersecurity Awareness, ...).
    "items": [],
}

SLA_BREACH_THRESHOLD = 1
RENEWAL_WARNING_DAYS = 30


class VendorMonitor:
    def __init__(self, store_path: str):
        self.store_path = store_path
        # Budget config is persisted alongside the vendor store.
        self.budget_path = os.path.join(os.path.dirname(store_path), "budget.json")
        if not os.path.exists(self.store_path):
            self._write_all(SEED_VENDORS)

    def _read_all(self) -> list:
        if not os.path.exists(self.store_path):
            self._write_all(SEED_VENDORS)
        with open(self.store_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_all(self, vendors: list):
        with open(self.store_path, "w", encoding="utf-8") as f:
            json.dump(vendors, f, indent=2, default=str)

    def _read_budget(self) -> dict:
        if not os.path.exists(self.budget_path):
            return dict(DEFAULT_BUDGET)
        with open(self.budget_path, "r", encoding="utf-8") as f:
            stored = json.load(f)
        # Merge over defaults so older files missing new keys still work.
        return {**DEFAULT_BUDGET, **stored}

    def _write_budget(self, budget: dict):
        with open(self.budget_path, "w", encoding="utf-8") as f:
            json.dump(budget, f, indent=2, default=str)

    @staticmethod
    def _days_until(expiry_date_str: str) -> int:
        expiry = datetime.strptime(expiry_date_str, "%Y-%m-%d").date()
        return (expiry - date.today()).days

    def _enrich_budget(self, budget: dict) -> dict:
        total = float(budget.get("total") or 0)
        spent = float(budget.get("spent") or 0)
        expiry = budget.get("expiry_date")
        days_left = self._days_until(expiry) if expiry else None
        return {
            "total": total,
            "spent": spent,
            "remaining": round(total - spent, 2),
            "percent_used": round((spent / total) * 100, 2) if total else 0,
            "expiry_date": expiry,
            "days_until_expiry": days_left,
            "expired": days_left is not None and days_left < 0,
            "active": bool(budget.get("active", False)),
            "term_days": budget.get("term_days"),
            "items": budget.get("items", []),
        }

    def get_budget(self) -> dict:
        with _lock:
            budget = self._read_budget()
        return self._enrich_budget(budget)

    def set_budget(self, total=None, spent=None, expiry_date=None, active=True) -> dict:
        """Sets/updates the security budget. Providing an expiry_date and
        active=True starts the live countdown on the dashboard."""
        with _lock:
            budget = self._read_budget()
            if total is not None:
                budget["total"] = float(total)
            if spent is not None:
                budget["spent"] = float(spent)
            if expiry_date is not None:
                budget["expiry_date"] = expiry_date
                # Capture the full period length so Renew can reset the timer.
                term = (datetime.strptime(expiry_date, "%Y-%m-%d").date() - date.today()).days
                budget["term_days"] = max(term, 1)
            budget["active"] = bool(active)
            self._write_budget(budget)
        return self._enrich_budget(budget)

    def renew_budget(self) -> dict:
        """Resets the countdown to a fresh full term: new expiry = today +
        the original term length, and reactivates the budget. Returns None if
        there is no budget term to renew."""
        with _lock:
            budget = self._read_budget()
            term = budget.get("term_days")
            if not term:
                return None
            new_expiry = (date.today() + timedelta(days=int(term))).isoformat()
            budget["expiry_date"] = new_expiry
            budget["active"] = True
            self._write_budget(budget)
        return self._enrich_budget(budget)

    def add_budget_item(self, category: str, description: str, amount: float) -> dict:
        """Adds an ad-hoc budgeted line item and debits it from the balance
        by increasing 'spent'. `category` describes what the money is for
        (e.g. License Tracking, Food, Cybersecurity Awareness)."""
        with _lock:
            budget = self._read_budget()
            item = {
                "id": f"BI-{uuid.uuid4().hex[:8].upper()}",
                "category": category,
                "description": description,
                "amount": float(amount),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            items = budget.get("items", [])
            items.append(item)
            budget["items"] = items
            budget["spent"] = float(budget.get("spent") or 0) + float(amount)
            self._write_budget(budget)
        return self._enrich_budget(budget)

    def add_license(self, name: str, vendor_name: str, expiry_date: str, annual_cost: float) -> dict:
        """Adds a new license/vendor entry and debits its cost from the
        budget balance as a 'License Tracking' budget item."""
        with _lock:
            vendors = self._read_all()
            vendor = {
                "vendor_id": f"VEN-{uuid.uuid4().hex[:6].upper()}",
                "name": name,
                "vendor_name": vendor_name,
                "expiry_date": expiry_date,
                "annual_cost": float(annual_cost),
                "sla_breaches": 0,
            }
            vendors.append(vendor)
            self._write_all(vendors)
        self.add_budget_item("License Tracking", f"{name} ({vendor_name})", annual_cost)
        return vendor

    def get_dashboard(self) -> dict:
        with _lock:
            vendors = self._read_all()
            budget = self._read_budget()

        enriched = []
        for v in vendors:
            days_left = self._days_until(v["expiry_date"])
            enriched.append({
                **v,
                "days_until_expiry": days_left,
                "renewal_warning": days_left <= RENEWAL_WARNING_DAYS,
                "sla_breach_flag": v["sla_breaches"] >= SLA_BREACH_THRESHOLD,
            })

        return {
            "vendors": enriched,
            "budget": self._enrich_budget(budget),
        }

    def draft_vendor_email(self, vendor_id: str) -> dict:
        with _lock:
            vendors = self._read_all()
        vendor = next((v for v in vendors if v["vendor_id"] == vendor_id), None)
        if vendor is None:
            return None

        days_left = self._days_until(vendor["expiry_date"])

        if days_left <= 0:
            subject = f"URGENT: {vendor['name']} Licence Has Expired"
            body = (
                f"Dear {vendor['vendor_name']} Account Team,\n\n"
                f"Our records show that the {vendor['name']} licence expired on {vendor['expiry_date']}. "
                f"Sterling Trust Bank Plc requires immediate renewal to avoid a lapse in security coverage. "
                f"Please confirm renewal terms and processing timeline at your earliest convenience.\n\n"
                f"Regards,\nVendor & Licence Monitoring Desk\nSterling Trust Bank Plc"
            )
        elif vendor["sla_breaches"] >= SLA_BREACH_THRESHOLD:
            subject = f"Service Level Agreement Review Required - {vendor['name']}"
            body = (
                f"Dear {vendor['vendor_name']} Account Team,\n\n"
                f"We have logged {vendor['sla_breaches']} SLA breach(es) against the {vendor['name']} service "
                f"in the current review period. We request a formal root-cause report and remediation plan "
                f"within 5 business days, in line with our service agreement.\n\n"
                f"Regards,\nVendor & Licence Monitoring Desk\nSterling Trust Bank Plc"
            )
        else:
            subject = f"Upcoming Renewal Notice - {vendor['name']} (Expires in {days_left} days)"
            body = (
                f"Dear {vendor['vendor_name']} Account Team,\n\n"
                f"This is a courtesy notice that the {vendor['name']} licence is due to expire on "
                f"{vendor['expiry_date']} ({days_left} days from now). Kindly share renewal pricing and "
                f"documentation so we can complete processing ahead of the expiry date.\n\n"
                f"Regards,\nVendor & Licence Monitoring Desk\nSterling Trust Bank Plc"
            )

        return {"vendor_id": vendor_id, "subject": subject, "body": body, "days_until_expiry": days_left}


_monitor_instance = None


def get_vendor_monitor(store_path: str = None) -> VendorMonitor:
    global _monitor_instance
    if _monitor_instance is None:
        if store_path is None:
            raise ValueError("store_path required for first initialization")
        _monitor_instance = VendorMonitor(store_path)
    return _monitor_instance
