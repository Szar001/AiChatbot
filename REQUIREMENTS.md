# AiChatbot GRC Platform — Requirements Specification

Status: draft, compiled from stakeholder notes (2026-07-10). Grouped by module,
mapped to existing code where an implementation already exists.

---

## 1. Budget & License Management (`grcmanagement`, `grc_api.py`)

- **1.1 License purchasing.** Adding a new license is a budget transaction:
  it debits the budget balance by the license cost at the time of creation.
- **1.2 Budget categorization.** Each budget line must record *what the money
  is for* (e.g. License Tracking, Food, Cybersecurity Awareness), not just an
  amount. Categories are user-defined, not hardcoded.
- **1.3 Ad-hoc budget items.** Users can add new budgeted line items outside
  the license flow (arbitrary category + amount + description).

## 2. Compliance Scoreboard (`grcmanagement`, `policy_store.py`)

- **2.1** Uploading a new policy or compliance document recalculates the
  compliance scoreboard (coverage/gap score), not just the document list.
- **2.2 Test data.** Need a way to upload fake/sample policies specifically
  to exercise the scoreboard scoring logic and the GRC query system (chatbot
  + `grcquery` page) without touching real policy data.
- **2.3 Gap logic flow.** Define the decision flow for identifying gaps
  between required controls (NDPA 2023, ISO 27001, CBN framework) and what's
  actually covered by uploaded policies — see §12 for the query mechanism
  this scoring is built on.

## 3. Life Documents (`life_doc.py`)

- **3.1** Open issue: unspecified problems with life document generation/
  storage — needs triage once reproduced (no detail given yet, flag for
  follow-up).
- **3.2 Auto-send on closure.** When a ticket is closed, the resulting life
  document is emailed back to the original requester.
- **3.3 AI-drafted, human-approved.** The requester's original submission
  (in their own language) plus the team member's resolution notes are used
  by the AI to draft the outbound email/life-document narrative. A team
  member must approve the draft before it sends — it is never auto-sent
  without sign-off.
- **3.4 Update ≠ close.** Editing/updating a life document does not
  implicitly close the associated ticket; closure is a separate, explicit
  action.

## 4. Text-to-Speech / Voice Input (`speech.js`)

- **4.1** In addition to live mic capture, users can upload a pre-recorded
  audio file as input to the same speech pipeline.

## 5. User Management / SLA Configuration

- **5.1** SLA time limits are configurable (or pre-defined per role) from the
  User Management portal, with separate settings for internal staff vs.
  external staff.

## 6. Ticket Routing (`ticket_classifier.py`, `workflow_api.py`)

- **6.1** When a requester self-selects a category at registration/submission
  time (Governance or Attack Security), the ticket must route to the correct
  team/team member for that stream, not just get a generic label — routing
  and classification are the same decision point.

## 7. Automated Triage & SLA Start (`chat_orchestrator.py`, `ticket_classifier.py`)

- **7.1 Instant classification.** On ticket submission, the system infers the
  underlying incident type (e.g. "HR database locked, files have a weird
  extension" → Ransomware), and:
  - auto-tags the stream (e.g. Defense/Attack Security),
  - sets urgency (e.g. Critical),
  - starts the SLA countdown,
  - all before a human reviewer looks at it.
- **7.2 Confidence gate.** Existing low-confidence-flags-for-review behavior
  in `ticket_classifier.py` stays as the safety net when the model isn't
  sure.

**Worked example (acceptance test):**
> Input: "The HR database is locked and everything has a weird file
> extension."
> Expected system behavior: classified as Ransomware → Defense Stream →
> urgency Critical → SLA clock started automatically, pre-human-review.

## 8. Security Posture Scoreboard

- **8.1** A dedicated scoreboard surfacing overall security posture (distinct
  from the compliance scoreboard in §2), likely rolling up: open
  Attack/Defense tickets by severity, SLA breach rate, redaction counts,
  patched vs. active exploits (§18).

## 9. GRC Query — RAG over Policies (`rag_copilot.py`, `grcquery`)

- **9.1** Auditor/Governance queries are embedded and matched against
  uploaded PDF policies (NDPA 2023, ISO 27001, etc.) via vector/TF-IDF
  similarity — this already exists as `rag_copilot.py`'s cosine-similarity
  retrieval over `BASELINE_CLAUSES` + uploaded documents.
- **9.2 Grounded answers only.** The answer must be constrained to facts
  found in retrieved clauses, and must print the exact source paragraph as
  evidence — no answer without a citable clause (anti-hallucination
  constraint).
- **9.3** Same retrieval path is reused by both the chatbot interface and the
  standalone GRC query system — one engine, two front doors.

## 10. Privacy / PII Redaction Filter

- **10.1** A lightweight filter sits between the chat interface and the
  permanent SQLite logs (`audit_log.sqlite3`, `tickets.sqlite3`-equivalent).
  On submit, it scans for sensitive data (credit card numbers, phone
  numbers, raw passwords) and replaces matches with `[REDACTED]` before
  persistence.
- **10.2 Pipeline order** (confirmed data flow):
  1. User input (text or voice, §4)
  2. Privacy filter (redact PII)
  3. Vector search over policies / past resolutions (§9, `life_doc.py`)
  4. LLM generates response from clean input + retrieved facts

## 11. Full Audit Logging (`audit_log.py`)

- **11.1** Every action is logged, including system/service-account actions
  ("even when the [process] does it from the system") — not just
  human-initiated ones. Extends the existing `AuditLogStore` schema to cover
  automated triage decisions (§7) and redaction events (§10) as first-class
  log entries, not side effects.

## 12. Compliance Reporting / Telemetry Rollup

- **12.1** The system maintains a live tally of: PII redactions performed
  (§10), user access log entries, and stakeholder boundary checks.
- **12.2** One-click export compiles this telemetry into a formal compliance
  report, intended to show examiners the system actively *validates*
  compliance rather than just asserting it.

## 13. End-to-End Data Journey (cross-cutting, ties §4/§6/§7/§10/§11 together)

1. Ingestion — request via text or voice.
2. Privacy filter — scrub PII/credentials.
3. Triage routing — AI assigns to Attack / Defense / Governance queue.
4. Logging — immutable audit ledger records the routing transaction.
5. Resolution — the assigned team works the ticket in their dedicated
   dashboard view before the SLA timer expires.

## 14. Exploit Playbook Repository

- **14.1** Central library of past code-level vulnerabilities: exact broken
  lines of code, how each was tested, and a Patched/Active toggle per entry.
  Feeds the security posture scoreboard (§8).

## 15. Automated Penetration Test Scheduler

- **15.1** Calendar-style interface for the Attack team to schedule
  automated scans (e.g. local Nessus-style scans) — designed to run at
  off-hours (e.g. midnight) to avoid impacting the live corporate network.

## 16. Open Logic-Flow Diagrams Needed

- **16.1** Policy/compliance gap-identification flow (detail in §2.3).
- **16.2** Request lifecycle flow (submission → redaction → classification →
  routing → SLA → resolution → life document → email), consolidating §6, §7,
  §10, §13.

---

## Traceability: existing code vs. new work

| Area | Existing | Gap |
|---|---|---|
| Ticket classification | `ticket_classifier.py` (TF-IDF/SVM, 3 labels) | Add urgency inference + SLA auto-start (§7) |
| Life documents | `life_doc.py` (SQLite store, MITRE tagging) | Email-on-close, AI draft + approval gate (§3) |
| RAG/policy Q&A | `rag_copilot.py` (TF-IDF cosine sim + evidence highlighting) | Formalize "no answer without citation" constraint (§9.2) |
| Audit log | `audit_log.py` (query/ticket/resolution events) | System-actor events, redaction events (§11) |
| Budget/licenses | `grc_api.py` (assumed) | Category field, ad-hoc items, balance debit on license add (§1) |
| Compliance scoreboard | `policy_store.py` (assumed) | Recalc-on-upload trigger, gap-scoring logic (§2) |
| Redaction filter | none found | New module: PII scanner + `[REDACTED]` rewrite before persistence (§10) |
| Security posture scoreboard | none found | New view/aggregation (§8) |
| Exploit playbook | none found | New CRUD module (§14) |
| Pentest scheduler | none found | New calendar/cron UI (§15) |
| Voice upload | `speech.js` (assumed live-mic only) | Accept uploaded audio file as alt input (§4) |
| SLA config UI | none found | New settings panel in User Management (§5) |
