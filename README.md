# HydroMonitor

A cataloging, monitoring, and risk-assessment system for hydraulic structures in the Zhambyl region. It transforms tabular data from RSE "Kazvodkhoz" into a web application featuring an interactive map, role-based access control (RBAC), automated reporting, and a built-in AI agent.

---

### 🛡️ Security & Architectural Overview (For Academic Review)

This project was developed as a production-ready MVP/hackathon prototype. It demonstrates core principles of **Cybersecurity** and **Distributed Systems Monitoring**:

* **Role-Based Access Control (RBAC):** Strict 3-tier access policy (`viewer`, `inspector`, `admin`) enforced at the API layer (FastAPI backend), preventing unauthorized state mutations regardless of client-side logic.
* **Authentication & Token Lifecycle:** Secure JWT authentication mechanism implementing short-lived Access Tokens and Refresh Token rotation, paired with `bcrypt` password hashing.
* **Audit Logging & Incident Response:** Comprehensive audit logging tracking all administrative actions and object state changes (Who/What/When) for accountability and security diagnostics.
* **Defensive Engineering:**
  * Rate limiting applied on authentication routes to mitigate brute-force and DDoS attempts (`slowapi`).
  * Protection against User Enumeration attacks on login endpoints.
  * Strict environment variable management for production secrets (`.env`).
* **IoT & Spatial Analytics Alignment:** Integration of rule-based risk scoring algorithms over geo-referenced sensor/infrastructure data (`react-leaflet`), serving as a foundation for Smart City / Industrial IoT monitoring systems.

> **Project Status:** *Completed (Archived MVP)*. Built to showcase full-stack security patterns, geospatial risk assessment, and API design.

---

## Features

**Map & Catalog**
* Interactive map displaying 438 facilities with three visualization layers: risk status, wear percentage, and construction year.
* Facility registry with search, filtering, sorting, and pagination.
* Facility card: general info, technical parameters, status change history, and downloadable PDF passports.
* "Categories" section — a criteria directory with a Kanban view categorized by state/condition levels.

**Risk Assessment**
* Transparent rule-based formula (no ML): facility age, gap between projected and actual efficiency, recorded defects, and wear percentage.
* Four calculated condition levels with a protective rule (a recorded defect caps the status to no better than "Requires Repair").
* Complete history of status recalculations for every facility.

**Reporting & Analytics**
* Real-time report generation (not static files): regional summary, priority/attention items, district reports, inspection schedules.
* Export capabilities: PDF (Cyrillic support) and CSV (UTF-8 BOM for seamless Excel opening).
* Analytics dashboard: status distribution, projected vs. actual efficiency comparison, decade dynamics, top high-risk facilities rating.

**Access & Security**
* JWT-based authentication with automatic session renewal.
* Three roles enforced at the backend API layer: `viewer` (read-only), `inspector` (+ edit permissions), `admin` (+ user management and audit logging).
* End-to-end Audit Log: tracks who modified what and when.
* Rate limiting, security headers, protection against user enumeration, and strict environment variable secret handling.

**Localization**
* Full UI localization in English, Kazakh, and Russian with instant switching.

**AI Agent**
* Works out-of-the-box without requiring API keys (rule-based fallback over real DB data).
* Easy integration with LLMs by modifying 3 environment variables (no code changes needed).
* Supports Groq (free), Grok, OpenRouter, Ollama, and Claude via a unified provider interface.
* Responds in the user's language, strictly relies on tool data, and features graceful degradation on model failures.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, react-leaflet, Recharts, i18next, Axios |
| **Backend** | FastAPI, Python 3.12, SQLAlchemy 2.0, Pydantic v2, ReportLab, pandas/xlrd |
| **Authentication** | JWT (access + refresh), bcrypt, RBAC |
| **Database** | SQLite (PostgreSQL + PostGIS ready) |
| **Infrastructure** | Docker, Docker Compose, Alembic, pytest, slowapi |
| **AI Integration** | Unified Provider Interface (Groq, Grok, OpenRouter, Ollama, Anthropic Claude) |

---

## Quick Start

### Option A — Docker (Recommended)

**Linux / macOS:**
```bash
cp backend/.env.example backend/.env # Set SECRET_KEY and ADMIN_PASSWORD in backend/.env
docker compose up --build

# In a separate terminal — seed the dataset (run once):
docker compose exec backend python -m app.data_import
```

**Windows (PowerShell/CMD):**

```cmd
copy backend\.env.example backend\.env
docker compose up --build

:: In a separate terminal:
docker compose exec backend python -m app.data_import
```
Access Points:

Frontend: http://localhost:8080

Backend & Swagger UI: http://localhost:8000/api/docs

### Option B — Local Setup (Without Docker)

**Backend — Linux / macOS:**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env   # задайте SECRET_KEY и ADMIN_PASSWORD

python -m app.data_import
alembic stamp head
uvicorn app.main:app --reload --port 8000
```

**Backend — Windows (PowerShell):**

```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt

copy .env.example .env   # задайте SECRET_KEY и ADMIN_PASSWORD

python -m app.data_import
alembic stamp head
uvicorn app.main:app --reload --port 8000
```

**Frontend (All Platforms):**

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on http://localhost:5173 and proxy API requests to the backend on port 8000.

### Default accounts

These are created automatically when the backend is first started:

| Username | Password | Role |
| ---|---|---|
| `admin` | the value of `ADMIN_PASSWORD` from `.env` | Administrator — full access |
| `viewer` | the value of `DEMO_VIEWER_PASSWORD` (default `viewer12345`) | View-only — for demonstration purposes without the risk of data being altered |

Before using the application outside of local development, set your own values for `SECRET_KEY` and `ADMIN_PASSWORD` in `.env` — if the default values are used, the backend will explicitly warn about this in the logs.

---

## Access Model

Permissions are cumulative across roles:

```
viewer → Read-only: dashboard, map, facility registry, categories, reports, analytics.

inspector → viewer rights + facility creation & editing.

admin → inspector rights + facility deletion, user management, audit log access.

```
> Note: Access decisions are enforced on the backend layer. Direct API calls from a viewer account receive a 403 Forbidden response regardless of client-side modifications.

---

## AI Agent & Providers

Designed to function seamlessly offline while supporting easy cloud LLM integration:

```
app/ai/
  tools.py                       — DB query functions (shared by stub & LLMs)
  base.py                        — Provider interface definition
  stub_provider.py               — Rule-based fallback without external dependencies
  openai_compatible_provider.py  — Unified implementation for OpenAI tool-calling format
  anthropic_provider.py          — Claude-specific implementation
  prompts.py                     — Shared system prompt
```

### Free Model Setup (Groq)

```env
AI_AGENT_ENABLED=true
AI_PROVIDER=groq
AI_PROVIDER_API_KEY=gsk_...
```

### Supported Providers

| Provider | `AI_PROVIDER=` | Value |
|---|---|---|
| Groq | `groq` | Free (Recommended) |
| Grok (xAI) | `grok` | Paid |
| OpenRouter | `openrouter` | Free models available (`:free` suffix) |
| Ollama | `ollama` | Free (Local) |
| Anthropic (Claude) | `anthropic` | Paid |

### Reliability

The system prompt sets the response language based on the user’s query, restricts the agent to using only tool data, and clearly distinguishes statistical observations from diagnostic statements. If the language model generates an incorrect tool call — a known feature of some open-source models when subjected to strict validation on the provider’s side — the system automatically switches to a response without consulting the tools, without returning an error to the user.

---

## Project Structure

```
hydromonitor/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py            # App entry point, middleware, routers
│   │   ├── settings.py        # Environment settings
│   │   ├── security.py        # Password hashing, JWT
│   │   ├── auth_deps.py       # Auth & role checks
│   │   ├── audit.py           # Audit logging
│   │   ├── models.py          # Database models
│   │   ├── scoring.py         # Risk scoring model
│   │   ├── ai/                # AI providers & tools
│   │   └── routers/           # API endpoints
│   ├── tests/                  # Automated tests (pytest)
│   └── requirements.txt
└── frontend/
    └── src/                   # React TypeScript frontend
```

---

## Running Tests

```bash
cd backend
pytest -v
```

Covers authentication, role-based access control, the risk model and the behaviour of the AI agent, including graceful degradation in the event of a language model failure.

```bash
cd frontend
npm run build
```

---

## Roadmap

| Timeline | Objectives |
|---|---|
| 1–2 mos. | Migration to PostgreSQL + PostGIS, photo/survey report uploads, GPS coordinate refinement |
| 3–6 mos. | Support for additional facility types, mobile app for field inspectors, regional system integrations, inspection delay alerts |
| 6–12 mos. | Predictive wear model based on historical data, satellite-based riverbed monitoring, public API for governmental agencies |
