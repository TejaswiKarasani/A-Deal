# A-Deal — Implementation TODO

Items are ordered by priority. Complete Tier 1 before moving to Tier 2, etc.
Each item includes what to build, where to build it, and how to verify it's done correctly.

---

## Tier 1 — Blocking (market cannot run without these)

### 1. Login Page
**What:** Frontend page at `/login` so returning users can authenticate.  
**Why blocking:** Register page links to `/login` which 404s. Users who close the tab are locked out.

**Files to create/modify:**
- `frontend/src/app/login/page.tsx` — login form (email + password → POST `/auth/token`)
- `frontend/src/lib/api.ts` — `login()` already exists, just needs the page

**Acceptance criteria:**
- [ ] `/login` renders without errors
- [ ] Submitting valid credentials stores JWT in localStorage and redirects to `/marketplace`
- [ ] Wrong password shows an inline error message
- [ ] Register page `/register` "Log in" link navigates correctly to `/login`
- [ ] On successful login, user is not asked to onboard again if already complete

---

### 2. Admin API — Run Management
**What:** Backend endpoints to create, open, close, and list all runs (including private ones).  
**Why blocking:** Runs are the containers for market activity. Without creating one, the scheduler has nothing to tick on.

**Files to create:**
- `backend/app/api/admin.py` — admin router

**Endpoints to implement:**
```
POST   /admin/runs          — create a run (name, model_assignment, is_real, is_public, start_at, end_at)
PATCH  /admin/runs/{id}     — update run status (pending → active → closed)
GET    /admin/runs          — list ALL runs (including private)
GET    /admin/users         — list all users with onboarding status and assigned model
PATCH  /admin/users/{id}    — set agent_model override for a specific user
```

**Files to modify:**
- `backend/app/main.py` — `app.include_router(admin.router)`

**Acceptance criteria:**
- [ ] POST `/admin/runs` with `{"name":"Run A","model_assignment":"all_opus","is_real":true,"is_public":true}` returns 200 with the created run
- [ ] PATCH `/admin/runs/1` with `{"status":"active"}` causes the scheduler to start processing agents on that run
- [ ] PATCH `/admin/runs/1` with `{"status":"closed"}` stops the scheduler from touching it
- [ ] GET `/admin/runs` returns all runs including private ones
- [ ] PATCH `/admin/users/1` with `{"agent_model":"deepseek-ai/deepseek-r1-0528"}` persists and is used in next market tick

---

### 3. Admin UI — Marketplace Control Panel
**What:** Frontend page at `/admin` to create runs and manage the market lifecycle.  
**Why blocking:** Without this, the only way to run the market is raw API calls.

**Files to create:**
- `frontend/src/app/admin/page.tsx` — admin dashboard

**UI sections:**
- Create Run form (name, model assignment dropdown, real/public toggles, start/end date)
- Run list with status badges and Open / Close action buttons
- User list showing each user's onboarding status and assigned model
- Model override selector per user

**Files to modify:**
- `frontend/src/lib/api.ts` — add `createRun()`, `updateRun()`, `listAllRuns()`, `listUsers()`, `updateUser()`

**Acceptance criteria:**
- [ ] Submitting Create Run form appears in the run list immediately
- [ ] Clicking "Open" on a pending run transitions it to `active` (verify via GET `/admin/runs`)
- [ ] Clicking "Close" on an active run transitions it to `closed`
- [ ] User list shows correct onboarding status for each user
- [ ] Model override dropdown saves and persists on page reload

---

### 4. Survey Submission API
**What:** Backend endpoints to submit and retrieve post-market survey responses.  
**Why blocking:** The `SurveyResponse` model exists but there is no endpoint wired up. This is the primary research output of the experiment.

**Files to create/modify:**
- `backend/app/api/survey.py` — new router

**Endpoints to implement:**
```
POST /survey/runs/{run_id}/submit  — submit satisfaction, fairness scores, run ranking, WTP
GET  /survey/runs/{run_id}/my      — get own submission for a run
GET  /admin/survey/runs/{run_id}   — aggregate results (admin only)
```

**Payload shape for POST:**
```json
{
  "overall_satisfaction": 6,
  "fairness_scores": {"deal_id_1": 4, "deal_id_2": 5},
  "preferred_run_rank": [1, 3, 2, 4],
  "willing_to_pay": true,
  "wtp_amount": 9.99
}
```

**Files to modify:**
- `backend/app/main.py` — include survey router

**Acceptance criteria:**
- [ ] POST `/survey/runs/1/submit` with valid payload returns 200
- [ ] Duplicate submission by same user for same run returns 400 (not 500)
- [ ] GET `/survey/runs/1/my` returns the submitted data
- [ ] GET `/admin/survey/runs/1` returns aggregate: mean satisfaction, mean fairness, WTP percentage

---

### 5. Survey UI
**What:** Frontend page at `/survey/[runId]` where users rate their experience after the market closes.

**Files to create:**
- `frontend/src/app/survey/[runId]/page.tsx`

**UI sections:**
- Overall satisfaction slider (1–7)
- Per-deal fairness rating (1–7) for each deal the user was part of
- Drag-to-rank the 4 run bundles from best to worst
- Willingness to pay: yes/no + amount input

**Files to modify:**
- `frontend/src/lib/api.ts` — add `submitSurvey()`, `getMySurvey()`
- `frontend/src/app/marketplace/page.tsx` — add "Rate your experience" button after run closes

**Acceptance criteria:**
- [ ] Survey page shows all deals the current user participated in
- [ ] Cannot submit without rating overall satisfaction
- [ ] Submitting redirects to a "Thank you" confirmation screen
- [ ] If already submitted, page shows previous answers read-only
- [ ] Survey link only appears when run status is `closed`

---

## Tier 2 — Important (needed before public use)

### 6. Run Auto-Close and Negotiation Expiry
**What:** Automatic market closure at `end_at` deadline and expiry of negotiations that hit `max_negotiation_rounds`.  
**Why:** Currently runs stay active forever. Negotiations can get stuck indefinitely.

**Files to modify:**
- `backend/app/services/market_engine.py`
  - In `run_agent_turn()`: skip run if `run.end_at < now`, set status to `closed`
  - In `_apply_action()`: when `round_count >= max_negotiation_rounds`, expire negotiation (already partially done, verify it actually commits to DB)
- `backend/app/main.py`
  - Add a second scheduled job `close_expired_runs` that runs every 5 minutes

**Acceptance criteria:**
- [ ] Create a run with `end_at` 2 minutes from now. After 2 minutes, run status is `closed` in DB
- [ ] Scheduler stops processing a closed run
- [ ] Negotiation with 10+ rounds gets status `expired` not `open`
- [ ] Expired negotiations don't block future offers on the same item

---

### 7. Alembic Database Migrations
**What:** Replace `Base.metadata.create_all()` with proper migration files.  
**Why:** Schema changes will break existing databases in production without migrations.

**Files to create:**
- `backend/alembic.ini`
- `backend/alembic/env.py`
- `backend/alembic/versions/0001_initial_schema.py`

**Steps:**
```bash
cd backend
alembic init alembic
# configure alembic/env.py to import Base and use settings.database_url
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

**Files to modify:**
- `backend/app/main.py` — remove `Base.metadata.create_all(bind=engine)`, let Alembic manage schema

**Acceptance criteria:**
- [ ] `alembic upgrade head` on a fresh database creates all tables correctly
- [ ] `alembic downgrade -1` reverts the schema without error
- [ ] Adding a new column to a model → new `alembic revision --autogenerate` captures it
- [ ] `alembic current` shows the correct revision head

---

### 8. Negotiation Transcript Page
**What:** Frontend page to view the full message history of a single negotiation.

**Files to create:**
- `frontend/src/app/marketplace/negotiations/[id]/page.tsx`

**UI:**
- Chat-bubble layout showing buyer/seller messages in order
- Item name, final price, status at the top
- Timestamps on each message

**Files to modify:**
- `frontend/src/lib/api.ts` — add `getNegotiation(runId, negotiationId)`
- `frontend/src/app/marketplace/page.tsx` — make deal rows clickable, linking to transcript

**Acceptance criteria:**
- [ ] Clicking a deal in the marketplace list navigates to `/marketplace/negotiations/{id}`
- [ ] All messages render in chronological order
- [ ] Buyer messages and seller messages are visually distinct (different sides/colours)
- [ ] If negotiation belongs to current user, page loads. If not, show 403 message.

---

### 9. Test Suite
**What:** Unit and integration tests for the most critical paths.  
**Why:** Zero tests currently. Any refactor risks silent breakage.

**Files to create:**
```
backend/tests/
  conftest.py               — pytest fixtures (test DB, test client, mock LLM)
  test_auth.py              — register, login, token validation
  test_onboarding.py        — interview turn, profile extraction, confirm
  test_marketplace.py       — listings, deals, negotiations
  test_market_engine.py     — agent turn logic, deal close, negotiation expiry
  test_analytics.py         — run summary, agent performance stats
```

**Mock strategy:** Patch `app.llm.llm` with a `MagicMock` that returns fixed JSON responses so tests don't hit real APIs.

**Acceptance criteria:**
- [ ] `pytest backend/tests/` passes with 0 failures
- [ ] Auth tests: register duplicate email returns 400, bad login returns 400, valid token returns user
- [ ] Market engine tests: `_close_deal()` marks item as sold, `_last_offer()` parses price correctly
- [ ] Test coverage on `market_engine.py` and `analytics.py` is ≥ 80%
- [ ] Tests run in under 30 seconds on CI

---

### 10. Error Handling and LLM Retry Logic
**What:** Graceful handling of LLM API failures (rate limits, timeouts, malformed JSON).

**Files to modify:**
- `backend/app/llm/providers.py` — wrap API calls with retry (3 attempts, exponential backoff)
- `backend/app/services/market_engine.py` — distinguish recoverable errors (retry) from fatal ones (skip agent turn)
- `backend/app/agents/trader.py` — if `_parse_action` returns `pass` after JSON failure, log it clearly

**Acceptance criteria:**
- [ ] If NIM returns a 429 (rate limit), the provider retries up to 3 times with 2s/4s/8s backoff
- [ ] If all retries fail, the agent's turn is skipped (not crashed)
- [ ] If LLM returns non-JSON text, `_parse_action` returns `{"action":"pass"}` and logs the raw text
- [ ] Market tick does not crash if 1 out of 10 agents fails its turn

---

## Tier 3 — Polish and Research Value

### 11. Analytics Dashboard UI
**What:** Frontend page at `/analytics` to visualise market results.  
**Backend endpoints already exist** — just needs frontend.

**Files to create:**
- `frontend/src/app/analytics/page.tsx`

**Suggested charting library:** `recharts` (lightweight, React-native)

**UI sections:**
- Run selector dropdown
- Summary cards: total deals, total value, sale rate, mean price
- Bar chart: deals per agent (sorted descending)
- Model comparison table: Opus vs Haiku — mean price sold, mean price paid, deals closed
- Price distribution histogram

**Files to modify:**
- `frontend/package.json` — add `recharts`
- `frontend/src/lib/api.ts` — `getRunSummary()` and `getAgentPerformance()` already exist

**Acceptance criteria:**
- [ ] Page loads without errors when at least one run with deals exists
- [ ] Selecting a different run updates all charts
- [ ] Model comparison table only appears when run has mixed model assignment
- [ ] All numbers match what GET `/analytics/runs/{id}/summary` returns

---

### 12. Navigation Bar
**What:** Persistent nav bar across all pages.

**Files to create:**
- `frontend/src/components/Navbar.tsx`

**Links:** Home · Marketplace · Analytics · Survey · Admin · Logout

**Files to modify:**
- `frontend/src/app/layout.tsx` — render `<Navbar />` above `{children}`

**Acceptance criteria:**
- [ ] Navbar appears on all pages except landing (`/`)
- [ ] Active page link is visually highlighted
- [ ] Logout clears localStorage token and redirects to `/login`
- [ ] Admin link only visible if user has admin role (or just always shown for now)

---

### 13. Pydantic Response Models on All API Endpoints
**What:** Add typed response models to all FastAPI routes so the API is self-documenting and validated.

**Files to modify:**
- `backend/app/api/marketplace.py`
- `backend/app/api/analytics.py`
- `backend/app/api/onboarding.py`

**Approach:** Add Pydantic schemas in a new `backend/app/schemas/` directory:
```
backend/app/schemas/
  marketplace.py   — ListingOut, DealOut, NegotiationOut
  analytics.py     — RunSummaryOut, AgentPerformanceOut
  user.py          — UserOut
```

**Acceptance criteria:**
- [ ] GET `/marketplace/runs/1/listings` response matches `ListingOut` schema exactly
- [ ] FastAPI `/docs` page shows correct response shapes for all endpoints
- [ ] Passing wrong field types to an endpoint returns a 422 with clear field-level errors

---

### 14. Proper Structured Logging
**What:** Replace `print`/basic `logging` with structured JSON logs.

**Files to modify:**
- `backend/app/main.py` — configure root logger with JSON formatter
- `backend/app/services/market_engine.py` — log agent turns, deal closes, errors
- `backend/app/agents/trader.py` — log action decisions and raw LLM responses

**Log events to capture:**
- Market tick started / completed (with run_id, agent count, duration)
- Agent action taken (user_id, run_id, action, item_id)
- Deal closed (negotiation_id, final_price, buyer, seller)
- LLM call made (provider, model, tokens_used, latency_ms)
- LLM call failed (provider, model, error, attempt number)

**Acceptance criteria:**
- [ ] All log lines are valid JSON with at minimum: `timestamp`, `level`, `event`, `run_id` or `user_id`
- [ ] Market tick logs include duration in ms
- [ ] LLM failures are logged at ERROR level with the raw exception message
- [ ] Logs can be grepped by `run_id` to reconstruct a full market session

---

### 15. Frontend Type Safety
**What:** Replace `any` types in frontend with proper TypeScript interfaces.

**Files to create:**
- `frontend/src/types/index.ts` — all shared DTO types

**Types to define:**
```typescript
type Run = { id: number; name: string; status: string; model_assignment: string; ... }
type Listing = { listing_id: number; name: string; asking_price: number; ... }
type Deal = { deal_id: number; item: string; final_price: number; ... }
type AgentPerformance = { user_id: number; name: string; model: string; net: number; ... }
```

**Files to modify:**
- `frontend/src/app/marketplace/page.tsx` — replace all `any[]` with typed arrays
- `frontend/src/lib/api.ts` — add generic return types to all functions

**Acceptance criteria:**
- [ ] `npm run build` completes with 0 TypeScript errors
- [ ] No `any` types remain in marketplace.tsx or api.ts
- [ ] Accessing a non-existent field on an API response causes a compile error, not a runtime one

---

## Quick Reference — Build Order

```
1.  Login page                    (30 min)
2.  Admin API                     (2 hrs)
3.  Admin UI                      (3 hrs)
4.  Survey API                    (1 hr)
5.  Survey UI                     (2 hrs)
-------- Market can run end-to-end above this line --------
6.  Run auto-close + expiry       (1 hr)
7.  Alembic migrations            (1 hr)
8.  Negotiation transcript page   (1 hr)
9.  Test suite                    (3 hrs)
10. Error handling + retry        (1 hr)
-------- Safe for production above this line --------
11. Analytics dashboard UI        (3 hrs)
12. Navbar                        (30 min)
13. Pydantic response models      (2 hrs)
14. Structured logging            (1 hr)
15. Frontend type safety          (1 hr)
```

**Estimated total:** ~25 hours of focused development
