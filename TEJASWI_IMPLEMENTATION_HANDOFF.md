# A-Deal Implementation Handoff for Tejaswi

Date: 2026-04-26
Repo: /mnt/c/Users/prave/sandbox/A-Deal
Branch: main

## Summary Verdict

Tier 1 is mostly implemented and verified, but it is not yet fully judge-approved.

What passes:
- Backend tests pass.
- Backend Python compile check passes.
- Frontend build passes.
- Frontend npm audit passes with 0 vulnerabilities.

What fails:
- Frontend lint fails because the project is on Next 16 and the current lint script still uses `next lint`, which is no longer valid.

Critical Tier 1 gap:
- Survey page currently appears to use all deals in a run instead of only deals the current user participated in. This must be fixed before saying Tier 1 is fully complete.

## Commands Already Verified

From repo root:

```bash
/mnt/c/Users/prave/sandbox/A-Deal/.venv/bin/python -m pytest /mnt/c/Users/prave/sandbox/A-Deal/backend/tests -q
```

Status: PASS

```bash
/mnt/c/Users/prave/sandbox/A-Deal/.venv/bin/python -m compileall -q /mnt/c/Users/prave/sandbox/A-Deal/backend/app
```

Status: PASS

From frontend folder:

```bash
npm run build
```

Status: PASS

```bash
npm audit --audit-level=moderate
```

Status: PASS, 0 vulnerabilities

```bash
npm run lint
```

Status: FAIL

Current lint error:

```text
Invalid project directory provided, no such directory: /mnt/c/Users/prave/sandbox/A-Deal/frontend/lint
```

Likely reason: package.json uses `next lint`, which is not compatible with current Next 16 setup. Replace with ESLint CLI configuration.

---

# Tier 1 Status

## 1. Login Page

Status: Mostly complete / acceptable MVP.

Implemented:
- `/login` page exists.
- Email/password login works through frontend API client.
- JWT token is saved in localStorage.
- User is redirected to `/marketplace` if onboarding is complete.
- User is redirected to `/onboarding` if onboarding is incomplete.
- Inline error message exists for login failure.

Files:
- `frontend/src/app/login/page.tsx`
- `frontend/src/lib/api.ts`
- `backend/app/api/auth.py`
- `backend/tests/test_auth_regression.py`

Remaining:
- Add frontend/UI test if desired.
- Improve polish/loading state.

Verdict: Acceptable.

## 2. Admin API

Status: Functionally implemented, but security-incomplete.

Implemented endpoints:
- `POST /admin/runs`
- `PATCH /admin/runs/{run_id}`
- `GET /admin/runs`
- `GET /admin/users`
- `PATCH /admin/users/{user_id}`

Files:
- `backend/app/api/admin.py`
- `backend/app/main.py`
- `backend/tests/test_admin_survey.py`

Remaining:
- Add real admin authorization/role check. Currently any authenticated user can call admin endpoints.
- Add stricter run status transition validation if required.
- Add tests that prove only admins can access admin routes.

Verdict: Works for MVP, not production-safe.

## 3. Admin UI

Status: Implemented MVP.

Implemented:
- `/admin` page exists.
- Create run form exists.
- Runs list exists.
- Open/Close run controls exist.
- Users list exists.
- User model override dropdown exists.

Files:
- `frontend/src/app/admin/page.tsx`
- `frontend/src/lib/api.ts`

Remaining:
- Add loading states.
- Add better per-action error messages.
- Add admin-only guard once backend admin role exists.

Verdict: Acceptable MVP.

## 4. Survey API

Status: Mostly implemented.

Implemented endpoints:
- `POST /survey/runs/{run_id}/submit`
- `GET /survey/runs/{run_id}/my`
- `GET /admin/survey/runs/{run_id}`

Files:
- `backend/app/api/survey.py`
- `backend/app/main.py`
- `backend/app/models/negotiation.py`
- `backend/tests/test_admin_survey.py`

Remaining:
- Add database-level unique constraint for `(user_id, run_id)` on survey responses.
- Ensure surveys can only be submitted for closed runs, if that is the intended rule.
- Ensure users can submit only if they participated in the run.
- Admin aggregate endpoint should require admin authorization.

Verdict: Good MVP, but needs DB and permission hardening.

## 5. Survey UI

Status: Partially complete.

Implemented:
- `/survey/[runId]` page exists.
- Satisfaction slider exists.
- Fairness sliders exist.
- WTP yes/no and amount controls exist.
- Already submitted survey becomes read-only.
- Thank-you message exists after submission.
- Marketplace shows “Rate your experience” link when selected run is closed.

Files:
- `frontend/src/app/survey/[runId]/page.tsx`
- `frontend/src/app/marketplace/page.tsx`
- `frontend/src/lib/api.ts`

Critical remaining issue:
- TODO requires survey page to show all deals the current user participated in.
- Current implementation appears to call run-level deals and may show all deals in the selected run, not only current user’s deals.

Other remaining issue:
- TODO asked for drag-to-rank 4 run bundles.
- Current implementation uses comma-separated ranking text input.

Verdict: Needs fix before Tier 1 is fully complete.

---

# Highest Priority Fixes for Tejaswi

## Priority 1: Fix Survey UI to show only current user’s participated deals

Problem:
- `frontend/src/app/survey/[runId]/page.tsx` should not show every deal from the run.
- It should show only deals involving the logged-in/current user.

Suggested implementation options:

Option A, preferred:
- Add backend endpoint like:
  - `GET /marketplace/runs/{run_id}/my/deals`
- It should return only deals where current user is buyer or seller for that run.
- Update survey page to call that endpoint.

Option B:
- Reuse existing `GET /marketplace/my/deals` if it contains enough run information.
- Filter by `run_id` on frontend.

Acceptance:
- Survey page lists only current user’s deals for that run.
- User cannot rate deals they were not part of.
- Add backend and/or frontend test if possible.

## Priority 2: Fix frontend lint

Problem:
- `npm run lint` currently fails due `next lint`.

Likely fix:
- Replace package script:

```json
"lint": "eslint ."
```

- Add/update ESLint config for Next 16 / ESLint 9.
- Then run:

```bash
cd frontend
npm run lint
npm run build
npm audit --audit-level=moderate
```

Acceptance:
- Lint passes.
- Build still passes.
- Audit still has 0 vulnerabilities.

## Priority 3: Add admin authorization

Problem:
- `/admin/*` routes are protected by login but not true admin role.

Needed:
- Add an admin flag/role to user model or use an allowlist approach for now.
- Admin endpoints should reject normal users with 403.
- Add tests proving non-admin cannot access admin endpoints.

Acceptance:
- Normal user: `GET /admin/runs` returns 403.
- Admin user: admin endpoints work.

## Priority 4: Add DB-level survey uniqueness

Problem:
- Duplicate survey prevention is only application-level.
- Race condition possible.

Needed:
- Add unique constraint on `(user_id, run_id)` for survey responses.
- Once Alembic exists, create migration for it.

Acceptance:
- Duplicate survey is impossible at DB level.
- API still returns friendly 400/409 response.

---

# Tier 2 Pending Implementation

## 6. Run auto-close and negotiation expiry

Status: Not fully implemented.

Current:
- Some negotiation expiry behavior exists in `market_engine.py`.
- But automatic run closing by `end_at` is not implemented.

Needed:
- Add scheduler/service function to close runs where `end_at < now` and status is active.
- Expire in-progress negotiations for closed/expired runs.
- Add tests.

Suggested files:
- `backend/app/services/market_engine.py`
- Possibly new service file for scheduler/maintenance jobs.
- Backend tests for run expiry.

## 7. Alembic migrations

Status: Not implemented.

Missing:
- `backend/alembic.ini`
- `backend/alembic/env.py`
- `backend/alembic/versions/0001_initial_schema.py`

Needed:
- Add Alembic.
- Create initial schema migration.
- Stop relying only on `Base.metadata.create_all(bind=engine)` for production schema.

## 8. Negotiation transcript page

Status: Backend exists, frontend missing.

Backend endpoint exists:
- `GET /marketplace/runs/{run_id}/negotiations/{negotiation_id}`

Missing frontend:
- `frontend/src/app/marketplace/negotiations/[id]/page.tsx`

Needed:
- Add API client function `getNegotiation()`.
- Make deal rows clickable.
- Show transcript/messages, agents, product, final state.

## 9. Full backend test suite

Status: Partially started.

Existing:
- `backend/tests/conftest.py`
- `backend/tests/test_admin_survey.py`
- `backend/tests/test_auth_regression.py`

Missing TODO-named tests:
- `backend/tests/test_auth.py`
- `backend/tests/test_onboarding.py`
- `backend/tests/test_marketplace.py`
- `backend/tests/test_market_engine.py`
- `backend/tests/test_analytics.py`

Needed:
- Add meaningful tests for all core APIs.
- Add market engine tests, especially edge cases.
- Add coverage check if required.

## 10. Error handling and LLM retry logic

Status: Not implemented.

Problem areas:
- `backend/app/llm/providers.py` has no obvious retry/backoff handling.
- No clear 429/rate-limit handling.
- Agent JSON parsing has fallback behavior but no strict schema or retry loop.

Needed:
- Add exponential backoff for LLM provider calls.
- Handle 429 and temporary network/provider errors.
- Log malformed LLM responses safely.
- Consider strict response schemas.

---

# Tier 3 Pending Implementation

## 11. Analytics dashboard UI

Status: Not implemented.

Missing:
- `frontend/src/app/analytics/page.tsx`
- `recharts` or equivalent chart library.

Backend analytics exists, but no frontend dashboard.

## 12. Navbar/navigation polish

Status: Not implemented.

Missing:
- `frontend/src/components/Navbar.tsx`

Needed:
- Add navigation between Marketplace, Admin, Analytics, Login/Logout.
- Add logout behavior that clears JWT.

## 13. Pydantic response models / schemas

Status: Not implemented.

Missing:
- `backend/app/schemas/marketplace.py`
- `backend/app/schemas/analytics.py`
- `backend/app/schemas/user.py`

Needed:
- Add explicit request/response models.
- Add `response_model=` to endpoints.
- Improve OpenAPI contract.

## 14. Structured logging

Status: Not implemented.

Needed:
- JSON structured logs.
- Market tick duration logs.
- LLM call duration/error logs.
- Avoid logging secrets.

## 15. Frontend type safety

Status: Not implemented.

Missing:
- `frontend/src/types/index.ts`

Known issue:
- `frontend/src/app/marketplace/page.tsx` has multiple `any` usages.

Examples found:
- `useState<any[]>([])`
- `useState<any>({ sold: [], bought: [] })`
- `myDeals.sold.map((d: any, i: number) => (`
- `myDeals.bought.map((d: any, i: number) => (`

Needed:
- Define shared frontend types.
- Update `api.ts` to return typed responses.
- Remove `any` from marketplace page.

---

# Files Created or Changed During Tier 1 Work

Backend:
- `backend/app/api/admin.py`
- `backend/app/api/survey.py`
- `backend/app/api/auth.py`
- `backend/app/main.py`
- `backend/requirements.txt`
- `backend/tests/conftest.py`
- `backend/tests/test_admin_survey.py`
- `backend/tests/test_auth_regression.py`

Frontend:
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/admin/page.tsx`
- `frontend/src/app/survey/[runId]/page.tsx`
- `frontend/src/app/marketplace/page.tsx`
- `frontend/src/lib/api.ts`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/tsconfig.json`
- `frontend/next.config.js`
- `frontend/next.config.ts` was removed.

Note:
- `LICENSE` and `README.md` were already modified before Tier 1 implementation began.

---

# Final Recommendation

Before adding new big features, Tejaswi should complete these in order:

1. Fix survey page to show only current user’s participated deals.
2. Fix `npm run lint` for Next 16 / ESLint 9.
3. Add admin authorization.
4. Add DB-level survey uniqueness.
5. Implement Tier 2 run auto-close and negotiation expiry.
6. Add Alembic migrations.
7. Add broader backend tests.
8. Add negotiation detail page.
9. Add analytics page, navbar, schemas, structured logging, and frontend types.

Current status in one line:

Tier 1 is implemented enough for an MVP demo, but not yet clean enough to call production-ready or fully TODO-complete.
