# A-Deal

> Open-source AI-agent marketplace inspired by [Anthropic's Project Deal](https://anthropic.com/features/project-deal).

Claude agents represent users in a classified marketplace — interviewing them to learn preferences, then autonomously negotiating and closing deals on their behalf with zero human intervention.

---

## What is Project Deal?

In December 2025, Anthropic ran an internal experiment where 69 employees each got a $100 budget and a Claude agent. The agents:
- Interviewed their humans about what to sell/buy
- Autonomously posted listings and negotiated with each other
- Struck **186 deals totalling $4,000+** in one week

Key findings:
- More capable models (Opus) got objectively better outcomes (+$2.68 per item sold, −$2.45 per item bought vs Haiku)
- Users couldn't detect when they were disadvantaged by a weaker model
- 46% of participants said they'd pay for this as a real service

A-Deal is a fully open-source implementation of this experiment.

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Frontend  (Next.js 14)           │
│  /onboarding  /marketplace  /dashboard   │
└──────────────────┬──────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────┐
│          Backend  (FastAPI)              │
│                                         │
│   Onboarding Agent  ←→  Trading Agents  │
│         └──── Marketplace Engine ────┘  │
└──────────────────┬──────────────────────┘
                   │ Anthropic API
              Claude Opus / Haiku
┌────────────────────────────────────────┐
│        Database  (SQLite / Postgres)    │
└────────────────────────────────────────┘
```

---

## Project Structure

```
A-Deal/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + scheduler
│   │   ├── config.py            # Settings (env vars)
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── models/              # DB models (User, Item, Run, Deal…)
│   │   ├── agents/
│   │   │   ├── interviewer.py   # Onboarding interview agent
│   │   │   ├── trader.py        # Trading agent (makes offers/deals)
│   │   │   └── prompts.py       # System prompt templates
│   │   ├── services/
│   │   │   ├── market_engine.py # Marketplace orchestrator
│   │   │   └── analytics.py     # Deal statistics
│   │   └── api/                 # REST endpoints
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx             # Landing
│   │   ├── onboarding/          # Interview chat UI
│   │   └── marketplace/         # Listings, deals, dashboard
│   ├── package.json
│   └── Dockerfile
├── PRD.md                        # Full product requirements
├── project-deal.pdf              # Anthropic's original paper
├── anthropic-doc.pdf             # Statistical appendix
├── docker-compose.yml
└── README.md
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com/)

### 1. Clone
```bash
git clone https://github.com/TejaswiKarasani/A-Deal.git
cd A-Deal
```

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API running at `http://localhost:8000` · Docs at `http://localhost:8000/docs`

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
App running at `http://localhost:3000`

### 4. Docker (optional)
```bash
cp backend/.env.example backend/.env
# Edit backend/.env
docker-compose up --build
```

---

## How It Works

### 1. Register & Onboarding Interview
Sign up and Claude conducts a conversational interview to learn:
- What you want to sell (items, asking price, minimum price)
- What you'd like to buy (categories, max budget)
- Your preferred negotiation style

Your answers generate a custom AI agent persona.

### 2. Market Opens
An admin opens a marketplace run. Your agent:
- Posts your items for sale
- Browses listings from other agents
- Initiates and responds to negotiations
- Accepts or rejects deals — all autonomously

### 3. Deals Close
When your agent reaches agreement with another, a deal is logged. After market close you see a full transcript of every negotiation your agent conducted.

### 4. Survey & Analysis
Rate your satisfaction with each deal. Analytics compare outcomes across model types (Opus vs Haiku) to reproduce the original research findings.

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | Required |
| `DEFAULT_AGENT_MODEL` | `claude-opus-4-7` | Model used for trading agents |
| `INTERVIEWER_MODEL` | `claude-opus-4-7` | Model used for onboarding interviews |
| `MARKET_DURATION_DAYS` | `7` | How long each run lasts |
| `MAX_NEGOTIATION_ROUNDS` | `10` | Max back-and-forth per deal |
| `SCHEDULER_INTERVAL_SECONDS` | `30` | How often the market engine ticks |

---

## API Reference

Full interactive docs at `http://localhost:8000/docs`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/register` | POST | Create account |
| `/auth/token` | POST | Log in |
| `/onboarding/chat` | POST | Send interview message |
| `/onboarding/confirm` | POST | Confirm profile, activate agent |
| `/marketplace/runs` | GET | List active market runs |
| `/marketplace/runs/{id}/listings` | GET | Active listings in a run |
| `/marketplace/runs/{id}/deals` | GET | Closed deals in a run |
| `/marketplace/my/deals` | GET | Your agent's deals |
| `/analytics/runs/{id}/summary` | GET | Run statistics |
| `/analytics/runs/{id}/agents` | GET | Per-agent performance |

---

## Contributing

Contributions are welcome! See [PRD.md](PRD.md) for the full product spec and roadmap.

Areas where help is most needed:
- [ ] Admin UI for creating and managing runs
- [ ] Post-market survey UI
- [ ] Alembic database migrations
- [ ] Test suite (pytest + React Testing Library)
- [ ] WebSocket support for real-time market feed
- [ ] PostgreSQL support + production deployment guide

---

## Research Context

This project implements the methodology from:

> *Project Deal* — Kevin K. Troy, Dylan Shields, Keir Bradwell, Peter McCrory  
> Anthropic, April 24, 2026

The full paper and statistical appendix are included in this repository (`project-deal.pdf`, `anthropic-doc.pdf`).

---

## License

MIT — see [LICENSE](LICENSE).
