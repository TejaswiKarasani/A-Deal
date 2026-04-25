# Product Requirements Document — A-Deal

> Open-source implementation of Anthropic's Project Deal experiment  
> Source research: *Project Deal* (Kevin K. Troy, Dylan Shields, Keir Bradwell, Peter McCrory — April 24, 2026)

---

## 1. Overview

A-Deal is an AI-agent marketplace platform where users are interviewed by an AI, which then autonomously negotiates and closes deals on their behalf. Inspired by Anthropic's internal Project Deal experiment, which demonstrated that Claude agents can represent humans in a real classified marketplace — striking 186 deals worth $4,000+ with no human intervention.

### Core Insight from Research
- AI agents **can** fully represent humans in a marketplace end-to-end.
- **Model quality matters significantly**: Opus agents closed ~2 more deals per person and extracted $2.68 more per item sold / paid $2.45 less per item bought vs. Haiku agents.
- Negotiation style instructions (aggressive vs. friendly) had **no statistically significant effect** — model capability dominated.
- 46% of participants said they'd pay for this service in real life.

---

## 2. Goals

| Goal | Description |
|------|-------------|
| Open-source reference implementation | Fully reproducible version of the Project Deal experiment anyone can run |
| Extensible agent framework | Swap in different LLMs, negotiation strategies, or marketplace types |
| Real-world usability | Can be deployed for actual P2P marketplaces (secondhand goods, services, etc.) |
| Research platform | Enable further study of agent-to-agent commerce and inequality effects |

---

## 3. User Roles

| Role | Description |
|------|-------------|
| **Participant** | A human who registers, completes the onboarding interview, and has an AI agent act on their behalf |
| **Marketplace Admin** | Controls market open/close, run configuration, and observability |
| **Observer** | Read-only access to market activity and deal statistics |

---

## 4. Core Features

### 4.1 Onboarding Interview
The entry point for every participant. A conversational Claude agent interviews the user and captures:

- **Sell profile**: Items to sell, descriptions, asking price, minimum acceptable price
- **Buy profile**: Categories of interest, maximum budget per item, preferences
- **Negotiation style**: Any instructions (e.g., "be friendly", "lowball first", "don't haggle with coworkers")
- **Constraints**: Deadlines, exclusions, special conditions

Output: a structured JSON profile + a custom system prompt for the user's trading agent.

**Acceptance criteria:**
- Interview is conversational (multi-turn), not a form
- Claude extracts structured data from free-form conversation
- User can review and edit their profile before activating their agent
- Supports re-interview to update preferences

### 4.2 Trading Agent
Each participant gets a dedicated Claude agent with:
- Their custom system prompt (derived from interview)
- Access to the current marketplace state (listings, open offers)
- Ability to: post a listing, make an offer, counter an offer, accept/reject a deal

**Acceptance criteria:**
- Agents act autonomously once the market opens — no human approval required per action
- Agents respect their owner's stated constraints (min price, style instructions)
- Agents do not reveal confidential user information (min price, budget ceiling) to counterparties
- Full conversation logs stored per negotiation thread

### 4.3 Marketplace Engine
Orchestrates all agent activity:

- **Scheduler**: Cycles through agents, giving each a turn to act
- **State machine**: Tracks each item through `listed → offered → countered → accepted → closed` or `rejected`
- **Matching**: Surfaces relevant listings to buyers based on buy profile
- **Conflict resolution**: Handles simultaneous offers on the same item
- **Market close**: Finalises all open deals at deadline

**Acceptance criteria:**
- Fully async — multiple negotiations run in parallel
- Configurable market duration (default: 7 days)
- Configurable run mode: all-same-model or mixed-model (for research)
- At least 4 simultaneous independent runs supported (mirroring original experiment)

### 4.4 Deal Tracker
Persistent record of all marketplace activity:

- All listings and their current state
- Full negotiation transcripts (message by message)
- Final deal terms (price, buyer, seller, item)
- Per-agent statistics (deals closed, total sold, total spent, net balance)

### 4.5 Post-Market Survey
After market close, participants rate:
- Overall satisfaction with their agent (1–7)
- Fairness of each individual deal (1–7, where 4 = fair to both)
- Preferred bundle ranking (rank the 4 runs, if multiple runs active)
- Willingness to pay for this service (yes/no + amount)

### 4.6 Analytics Dashboard
Admin and participant views showing:
- Total deals, total value, sale rate by run
- Model performance comparison (if mixed-model run)
- Price distribution histogram
- Per-item performance across runs

---

## 5. Technical Architecture

```
┌────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                 │
│  /onboarding  /marketplace  /deals  /dashboard  /survey │
└────────────────────┬───────────────────────────────────┘
                     │ REST API
┌────────────────────▼───────────────────────────────────┐
│                  Backend (FastAPI)                       │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Onboarding  │  │  Marketplace │  │   Analytics  │  │
│  │    Agent     │  │    Engine    │  │     API      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘  │
│         │                 │                             │
│  ┌──────▼─────────────────▼───────────────────────┐    │
│  │              Trading Agent Layer                │    │
│  │   (N agents, each with custom system prompt)    │    │
│  └──────────────────────┬──────────────────────────┘    │
│                         │ Anthropic API                  │
└─────────────────────────┼───────────────────────────────┘
                          ▼
              ┌───────────────────────┐
              │   Claude API          │
              │  (Opus / Haiku / etc) │
              └───────────────────────┘
┌────────────────────────────────────────────────────────┐
│                   Database (SQLite/PostgreSQL)           │
│  users │ items │ listings │ negotiations │ deals │ runs  │
└────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, FastAPI, SQLAlchemy, Alembic |
| AI | Anthropic Python SDK (`anthropic`) |
| Database | SQLite (dev), PostgreSQL (prod) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Task queue | asyncio + APScheduler (simple), or Celery (scale) |
| Auth | JWT (simple) |
| Containerisation | Docker + docker-compose |

---

## 6. Data Models

### User
```
id, name, email, budget, agent_model, system_prompt, created_at
```

### Item
```
id, seller_id, name, description, asking_price, min_price, category, status
```

### Run
```
id, name, model_assignment (all_opus | mixed), is_real, is_public, start_at, end_at
```

### Listing
```
id, run_id, item_id, agent_id, status (active | sold | withdrawn)
```

### Negotiation
```
id, run_id, item_id, buyer_id, seller_id, status, started_at, closed_at
```

### Message
```
id, negotiation_id, sender_agent_id, content, timestamp
```

### Deal
```
id, negotiation_id, final_price, closed_at
```

### SurveyResponse
```
id, user_id, run_id, satisfaction_score, fairness_scores (JSON), wtp, preferred_run_rank
```

---

## 7. Agent Behaviour Spec

### Onboarding Agent
- Role: neutral interviewer
- Asks open-ended questions, digs for specifics (prices, items, constraints)
- Does NOT coach users on strategy
- Produces structured JSON at end of conversation

### Trading Agent
- Role: advocate for its user
- Has access to: current listings, their own sell profile, their buy profile
- Must NOT: lie about item condition, reveal user's minimum price, fabricate facts about itself (e.g., claim to be human, confabulate personal details)
- Must: honour user's negotiation style preferences, stay within stated price boundaries
- Can: make creative pitches, bundle deals, propose trades, negotiate in any style

### Confidentiality Rules (derived from research findings)
- The agent's `min_price` and `max_budget` are never shared with counterparties
- The user's full system prompt is never exposed
- Agents identify themselves as AI if directly asked

---

## 8. Market Mechanics

### Turn-based Scheduler
1. Market opens — all listings are published
2. Scheduler cycles through all active agents in random order
3. Each agent observes the marketplace state and decides: post / bid / counter / accept / pass
4. Actions are applied, state updates
5. Repeat until market closes or all items are sold

### Deal Lifecycle
```
Item listed
    │
    ▼
Offer received ◄─── Counter-offer loop (max N rounds configurable)
    │
    ▼
Accepted → Deal closed → Balance updated
    or
Rejected → Item remains listed
```

### Multi-run Support
Runs are fully independent. A participant's agent runs identically in each run. The "real" run (the one where physical exchange happens) is designated at setup but kept hidden from participants until after the survey.

---

## 9. Key Research Findings to Reproduce

| Finding | Implementation requirement |
|---------|--------------------------|
| Opus >> Haiku on deal count (+2.07 deals, p=0.001) | Support configurable model per agent; log all deal counts |
| Opus seller extracts $2.68 more | Track sale prices per agent model; export for analysis |
| Opus buyer pays $2.45 less | Track purchase prices per agent model |
| Aggressive prompting had no significant effect | Capture negotiation style; tag in analytics |
| Users couldn't detect their disadvantage | Post-survey satisfaction + perceived fairness metrics |
| 46% WTP for agent service | Include WTP question in post-market survey |

---

## 10. Out of Scope (v1)

- Payment processing / real money transfers
- Mobile app
- Multi-language support
- On-device/local LLM support (API-only for now)
- Reputation/rating system between users

---

## 11. Success Metrics

| Metric | Target |
|--------|--------|
| Deals completed per 10-user market | ≥ 20 deals |
| Average satisfaction score | ≥ 4.5 / 7 |
| Sale rate | ≥ 30% of listed items |
| Opus vs Haiku delta reproducible | p < 0.05 on deal count |
| Time to first deal | < 5 minutes from market open |

---

## 12. Open Questions / Future Research

- Does the Opus > Haiku advantage hold with Claude 4.x models?
- Can users be coached to detect when they have a weaker agent?
- What happens with adversarial agents (corporations optimising for AI attention)?
- Can agent-to-agent commerce reduce transaction friction vs. human-to-human?
- What safeguards prevent prompt injection between agents?
