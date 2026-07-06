# AI Automated Tech Support Desk for Cybersecurity Management

A final-year research project — *A Case Study of Sterling Trust Bank Plc*.

The system pairs a **Next.js** frontend with a **Flask** backend implementing four
modules: AI ticket triage, a GRC Co-Pilot RAG engine, a Life Document knowledge
base, and vendor/licence/budget monitoring. All AI runs locally (TF‑IDF + scikit‑learn);
there are **no external API calls** — the assistant reasons only over the
organisation's own data.

- **Principal Investigator:** Lawal Oluwatumininu Abdulrauf
- **Supervisor:** Prof. Moses K. Aregbesola
- **Institution:** Caleb University — Department of Cyber Security

---

## Architecture

```
AiChatbot/
├── src/                  # Next.js frontend (App Router)
│   ├── app/              # pages: AI chat (/), requests, serviceteams,
│   │                     #        servicedesk, grcmanagement, grcquery, login
│   └── lib/              # auth (RBAC + authFetch), speech-to-text
└── backend/              # Flask API (port 5000)
    ├── app.py            # application factory + blueprint registration
    ├── config.py         # paths, CORS origins, thresholds
    ├── engine/           # classifiers, RAG copilot, stores, auth, audit log
    ├── routes/           # auth, chat, tickets, grc, workflow blueprints
    ├── data/             # runtime JSON / SQLite stores (git-ignored)
    └── uploads/policies/ # uploaded policy documents (git-ignored)
```

The frontend talks to the backend at `http://127.0.0.1:5000` (set in
[`src/lib/auth.js`](src/lib/auth.js) as `API_BASE_URL`).

---

## Prerequisites

| Tool | Version used | Notes |
|------|--------------|-------|
| **Node.js** | 18+ (tested on 20/23) | for the Next.js frontend |
| **Python** | 3.10+ | for the Flask backend |
| **npm** | 9+ | ships with Node |

---

## Setup

Clone the repo, then set up the two halves. **Both must be running at the same
time** — use two terminals.

### 1. Backend (Flask API — port 5000)

```bash
cd AiChatbot/backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies (first run can be slow; increase timeout if the network is flaky)
pip install --default-timeout=120 -r requirements.txt

# Run the API
python app.py
```

The API is now live at **http://127.0.0.1:5000**. Verify:

```bash
curl http://127.0.0.1:5000/api/v1/health
# -> {"service":"sterling-trust-bank-tech-support-desk","status":"ok"}
```

On first start, the backend seeds demo users and creates the `data/` and
`uploads/policies/` folders automatically.

### 2. Frontend (Next.js — port 3000)

In a **second terminal**:

```bash
cd AiChatbot

npm install
npm run dev
```

Open **http://localhost:3000** and you'll be redirected to the login page.

> The backend's CORS allows `localhost:3000` and `localhost:3001`. If port 3000
> is taken, run `npm run dev -- -p 3001` — it will still reach the API.

---

## Demo accounts

All accounts use the password **`password123`**. The login page has clickable
autofill buttons for each. Access is role-scoped (RBAC):

| Role | Email | Can access |
|------|-------|-----------|
| User | `user@sterlingtrust.com` | AI Chat, Requests |
| Service Desk Officer | `servicedesk@sterlingtrust.com` | AI Chat, Service Desk |
| Governance | `governance@sterlingtrust.com` | AI Chat, Service Teams, GRC Management, GRC Query |
| Defence | `defense@sterlingtrust.com` | AI Chat, Service Teams |
| Attack Security | `attack@sterlingtrust.com` | AI Chat, Service Teams |
| Auditor | `auditor@sterlingtrust.com` | AI Chat, GRC Query |
| CISO | `ciso@sterlingtrust.com` | All pages |

---

## Key features to try

- **AI Chat (`/`)** — ask a **policy question** ("How long can we retain login
  history logs?") to get a RAG-grounded answer with a downloadable source
  snippet, or **report a threat** ("We are experiencing a brute-force attack on
  our API gateway") to get a categorised ticket + a Technical Action Script.
- **Speech-to-text** — click the mic in the chat/input boxes. Requires **Chrome
  or Edge** over `localhost` (the Web Speech API needs a secure context).
- **GRC Management** — upload a policy (PDF/DOCX/TXT); the AI flags framework
  coverage gaps.
- **GRC Query** — audit queries with green-highlighted statutory citations and a
  persisted history panel.
- **Service Desk** — set a **budget** with an expiry date, watch the live
  countdown, and **renew** to reset the timer.

---

## Notes for collaborators

- **Runtime data is git-ignored.** Everything under `backend/data/` and
  `backend/uploads/policies/` is regenerated at runtime and excluded via
  [`backend/.gitignore`](backend/.gitignore). Delete those files anytime to
  reset to a clean seed state.
- **Restarting the backend** picks up Python changes. Next.js hot-reloads the
  frontend automatically.
- **Linting the frontend:** `npm run lint` (or `npx eslint <file>`).
- **Changing the API URL:** edit `API_BASE_URL` in `src/lib/auth.js` and the
  `CORS_ORIGINS` list in `backend/config.py`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Login/API calls fail | Ensure the Flask backend is running on port 5000. |
| CORS error in console | Frontend must run on `localhost:3000` or `:3001`; adjust `CORS_ORIGINS` otherwise. |
| `pip install` times out | Retry with `pip install --default-timeout=120 -r requirements.txt`. |
| Mic button disabled / no transcript | Use Chrome/Edge via `localhost` (not a LAN IP); grant microphone permission. |
| Port 3000 already in use | `npm run dev -- -p 3001`. |
