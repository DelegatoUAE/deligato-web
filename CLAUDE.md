# Deligato Web — rules for Claude Code

## What this is
The Deligato web client: a React 19 + Vite SPA for consultant / project resource
allocation. This folder (`web/`) is its own git repo (`DelegatoUAE/deligato-web`),
deployed on Vercel. Two sibling projects live alongside it and are **not** in this repo:

- `../api` — Express 5 + Supabase backend (also holds the OpenAI matching engine)
- `../mobile` — Expo / React Native app hitting the same API

## Run it
```
npm run dev      # Vite dev server (default port 5173)
npm run build    # production build to dist/
npm run lint     # eslint
```
The API must be running separately: `cd ../api && npm start` (port 3000).

## Architecture
- `src/main.jsx` → `src/App.jsx` — all routes live in App.jsx (react-router-dom v7).
- Auth-gated routes are wrapped in `<Protected>`: `ProtectedRoute` fetches the
  current user and passes `me` into `Layout`, which renders the topbar + nav.
- `src/lib/auth.js` is the only network layer. `apiFetch` attaches the bearer
  token from `localStorage['deligato.access_token']`, parses JSON, and throws an
  `Error` with `.status` on non-2xx. Base URL: `VITE_API_URL` (default
  `http://localhost:3000`). Add new API calls here, not inline in pages.
- Pages in `src/pages/` are self-contained: local `useState`, `useEffect` →
  `apiFetch`, then render. No global store, no data-fetching library.
- `vercel.json` rewrites everything to `/index.html` for client-side routing.

## Domain
Backend tables: `users`, `consultants`, `projects`, `project_allocations`.
User roles: `project_manager`, `employee`, `finance`, `executive_hr`.
"AI Match" ranks consultants against a project brief — the API returns a
`provider` of `openai` or `heuristic` (the fallback when `OPENAI_API_KEY` is
unset), and the UI shows which one produced the ranking. Allocating creates a
`project_allocations` row with status `proposed`.

## Conventions
- Plain CSS, no framework. Design tokens are CSS variables in `src/index.css`;
  component styles in `src/App.css`, grouped by section with `/* ==== NAME ==== */`
  banners. Use the tokens (`var(--brand)`, `var(--surface)`, `var(--radius)`…)
  rather than hard-coded colors.
- Brand: Deligato · Capital Access in the Conncct design language (navy #051C38, gold #E7A81E, cream #F8F5EF, Poppins). Tokens and primitives live in `src/design/` (see `src/design/ADOPTION.md`); routes and the API per screen are in `src/IA.md`.
- No TypeScript. Function components, default-exported.
- Small, surgical edits. Don't reformat unrelated code or restyle working pages.

## Working rules
- Bilal is founder and decision-maker. Propose, then build. Honest, never flattery.
- Never invent API fields, endpoints, or data shapes — check `../api/routes/`
  and `../api/db/schema.sql` before wiring anything new.
