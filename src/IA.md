# Deligato Web: information architecture (reference for desktop and mobile)

The founder app's routes, navigation and the API each screen uses. Specs: `BUILD/product/ia.md` (v2), `BUILD/product/screens/*.md`, `BUILD/DECISIONS.md` D13–D26. Brand: **Deligato · Capital Access** in the Conncct design language. "Conncct" appears only as the source of the readiness methodology ("From Conncct", "Conncct engine (embedded)").

## Shell
- `components/AppLayout.jsx`: the design-system `AppShell` with the navy sidebar. The groups are **Home · Capital (primary, live counts) · Experts · Company**, plus Workspace for staff, Ask AI and Settings. The top bar holds the readiness pill, the plan badge and Ask AI.
  - Mobile (< 768px) adds a bottom tab bar: Home, Capital, Experts, Company, AI.
  - Below 1024px each page shows its section sub-nav (`components/SubNav.jsx`, items in `components/nav.js`).
- `components/CompanyProvider.jsx` (`useCompany()`) holds the session, the active company, the readiness, the plan, entitlements, the latest run, the pipeline and the data room. Each piece loads and fails on its own.
- `components/FirstRunGuard.jsx` sets where a route may render. `open` always renders. `company` needs a company, otherwise it goes to Home. `confirmed` also needs a confirmed raise or a run, otherwise it goes to `/capital/find`. `welcome` is for the first run only.
- `components/AssistantPanel.jsx` is the contextual assistant. It runs `POST /api/v1/intelligence/tasks/assistant` with `{screen, question, record_id?, run_id?}`. It explains and points, and never acts.
- `components/ErrorBoundary.jsx` stops one broken screen from blanking the shell.

## Routes → screen → API

| Route | Screen (spec) | API (all through `src/lib/*`, `apiFetch` in `lib/auth.js`) |
|---|---|---|
| `/login` | Sign in (+ dev persona sign-in when `import.meta.env.DEV`) | `/auth/login`, dev only: `/auth/dev-login`, `/auth/dev-login/personas` |
| `/` | Home command centre (00) | readiness, `/capital/runs` (latest two), `/capital/pipeline`, `/capital/profiles/:id/unlocks`, `/api/v1/routing/:id`, `/api/v1/packages/recommendation/:id`, `/api/v1/experts/requests`; ranking in `lib/home.js#rankActions` (unit-tested, `npm test`) |
| `/welcome` | First run (01) | company + readiness |
| `/dev/import` | Dev import (01, staff + `VITE_DEV_IMPORT`) | `/api/v1/conncct/dev/import`, `/dev/validate` |
| `/capital` | Capital overview (17) | run, pipeline, data room |
| `/capital/readiness` | Readiness (15) | `GET /api/v1/conncct/companies/:id/readiness` |
| `/capital/readiness/assess` | Questionnaire (15) | `GET /api/v1/conncct/readiness/questions`, `POST /readiness/assess` |
| `/capital/find` | Find capital: routing (16) | `GET /api/v1/routing/:id`, `POST /routing/:id/selection`, `POST /capital/profiles/:id/match` |
| `/capital/need` | Capital need (05) | `PATCH /api/v1/routing/:id/capital-need` (confirms); fallback `PATCH /capital/profiles/:id` |
| `/capital/matches` | Matches, three evidence tiers (06, D24) | `GET /capital/runs/:id`, `/capital/profiles/:id/unlocks`, `/capital/match/preview` (excluded list), `/api/v1/learning/feedback` |
| `/capital/matches/:recordId` | Capital provider profile (07, §8 sections) | `getSource(recordId, companyId)` (always `?company_id=`), run result, `/api/v1/learning/corrections`, `/api/v1/fundraising/:id/outcomes` (not_fit), intelligence `investor_brief` |
| `/capital/saved` | Saved (18) | `/capital/pipeline` (stage shortlisted), `PATCH /capital/pipeline/:id` |
| `/capital/pipeline` | Pipeline CRM (11) | `/capital/pipeline`, `/api/v1/fundraising/:id/outcomes`, `/activities`, `/investors/:rid/timeline`, `/api/v1/learning/outcomes` (contacted) |
| `/capital/data-room` | Data room (09) | `/api/v1/fundraising/:id/dataroom`, `/dataroom/items` |
| `/capital/outreach(/:draftId)` | Outreach, draft-only (10) | `/api/v1/fundraising/:id/outreach/drafts` (create, edit, approve, `sent_by_founder`) |
| `/capital/insights` | Insights (12) | `GET /api/v1/learning/insights/:id` |
| `/capital/improve` | Improve your matches (04) | unlocks, `/api/v1/advice/:id`, capital-need PATCH + re-run |
| `/packages` | Packages (08) | `/api/v1/packages/catalog`, `/recommendation/:id`, `/selection`, `/entitlements/:id` |
| `/experts` | Find an expert (20) | `/api/v1/experts/taxonomy`, `/interpret`, `/match`, `/directory`, `/requests` (Capital Assessment) |
| `/experts/results/:briefId` | Matched experts (21) | `/match` (cached per brief), `/requests/:id`, `/requests/:id/shortlist` |
| `/experts/:id` | Expert profile (22) | `/directory/:id`, `/requests`, `/requests/:id/start-project` |
| `/experts/mine` | My experts (23) | `/experts/shortlist`, `/experts/requests` |
| `/experts/projects` | Projects (23); staff see the legacy table | `/experts/projects` (cancel, outcome); staff `/projects` |
| `/company` | Company profile (03) | `/capital/profiles/:id` (the companies row) |
| `/company/business` | Business information + company intelligence | `PATCH /capital/profiles/:id`, intelligence `company_brief` |
| `/company/documents` | Documents (09) | data room |
| `/settings` | Account · Privacy and AI · Plan (14) | `/api/v1/privacy/consent-texts`, `/consents`, `/export`, `DELETE /me` (two-step) |
| `/workspace/*` | Staff: expert admin, all projects, AI Match | legacy `/consultants`, `/projects`, `/allocations` |

Legacy and v1 links redirect (`/matches/*`, `/pipeline`, `/consultants/*`, `/projects`, ...), as listed in `App.jsx`.

## Visual rules encoded in components
- **Readiness**: `ScoreRing variant="readiness"` only (Readiness, Overview, Welcome, Company). The band and score come as sent, and the source is always named (`lib/readiness.js#readinessSource`).
- **Capital match**: `components/capital/MatchScore.jsx`, a square navy tile with a confidence bar. Never a ring.
- **Expert fit**: the `ExpertScore` pill in `components/ExpertCard.jsx`. Never shown on a capital screen.
- **Fit chips**: `components/capital/FitPills.jsx`. Four states that don't rely on colour alone (unknown is dashed). Hover or tap shows the D16 provenance label.
- **Evidence buckets first, tier inside** (D24): `lib/capital.js#bucketHeadline` / `tierWithinBucket`. The client never promotes a result to "Verified eligible" without a server bucket.
- **Expert bridge**: `components/ExpertBridgeLink.jsx`, a grey text link that sits below the item's own action. Never a button, never gold.
