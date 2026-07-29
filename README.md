# BoardroomAI

An AI-powered virtual board of directors. Founders pitch; a panel of AI
executives (CEO, CTO, CFO, CMO, VC, Legal, Research, Growth) debates the
pitch live, votes, and produces an investment decision, SWOT, market
research, financials, a pitch deck, a roadmap, a PRD and an executive
report.

**Full stack.** Groq runs the debate and writes every deliverable;
Supabase handles auth and storage. See [`BACKEND.md`](./BACKEND.md) for how
it fits together.

## Getting started

```bash
npm install
```

Then:

1. Copy `.env.example` to `.env.local` and set `GROQ_API_KEY`
   ([get one here](https://console.groq.com/keys)) plus your two
   `NEXT_PUBLIC_SUPABASE_*` values.
2. Run both migrations in `supabase/migrations/` in filename order.
3. Enable the auth providers you want in Supabase, with `/auth/callback` as
   the redirect.

```bash
npm run dev
```

Visit `/` for the landing page. Sign in, then submit a pitch at
`/meeting/new` — you'll be dropped into `/boardroom` and the board starts
debating immediately.

Check `/api/health` to confirm your setup: it reports `dbConfigured` and
`aiConfigured` without requiring a session.

## Routes

**Marketing** (`components/layout/marketing-navbar.tsx` + `footer.tsx`):
- `/` — Landing (hero, how it works, executives, features, testimonials, pricing, FAQ, CTA)
- `/pricing` — Standalone pricing + FAQ
- `/about` — Mission, values, board roster
- `/login`, `/auth/forgot-password`, `/auth/update-password` — Auth

**App** (`components/layout/app-shell.tsx` — collapsible Sidebar + Navbar).
Every route below requires a session; `proxy.ts` redirects to `/login`
otherwise.

- `/dashboard` — Metrics, score trend, recent meetings, activity feed
- `/meeting/new` — Pitch submission, executive multi-select
- `/boardroom` — Live session: seating grid, transcript, consensus. Reads `?meeting=<id>`, or falls back to your newest session
- `/reports` — Searchable report list
- `/reports/[id]` — Full report: executive summary, SWOT, radar chart, risk matrix, financial highlights
- `/market-research` — Market sizing donut, growth trend, competitor matrix
- `/financials` — KPI metrics, revenue/expense chart, cap table
- `/startup-health` — Health score ring, dimension radar, flags
- `/executives` — Full 8-agent roster, filterable, with profile dialog
- `/pitch-deck` — Slide thumbnail rail + preview pane
- `/prd-generator` — Section outline + generated spec content
- `/kanban` — 4-column visual board
- `/history` — Version timeline
- `/settings` — Profile / Workspace / Notifications / Billing tabs

## What a session produces

Submitting a pitch creates a meeting, seats the executives you picked, and
runs the debate two rounds per executive. When the debate ends the board
votes and the model writes:

- the **report** (`/reports/[id]`) — score, verdict, summary, SWOT,
  dimension scores, risk matrix, financial highlights
- the **deliverables** — market research, financial model, health snapshot,
  PRD and pitch deck, which replace the seeded defaults on those screens

A new account is seeded with placeholder workspace data so no screen is
empty before the first session.

## Folder structure

```
app/
  (app)/                # Route group: every authenticated page, wrapped by AppShell
  (marketing)/          # Route group: /pricing, /about
  api/                  # Route handlers — see BACKEND.md
  auth/                 # OAuth callback, sign-out
  page.tsx              # Landing page ("/")
  layout.tsx            # Root layout — fonts + providers only
components/
  ui/                   # Primitives
  shared/               # Composed, cross-feature components
  layout/               # Sidebar, Navbar, AppShell, MarketingNavbar, Footer
features/<name>/        # One folder per route: components/, service.ts, types.ts
hooks/                  # useMediaQuery, useReducedMotion, useDisclosure, useWorkspace
lib/
  ai/                   # Groq client, personas, debate policy, generators
  server/               # Domain logic — the only thing route handlers call
  supabase/             # Browser, server and proxy clients
providers/              # ThemeProvider, AuthProvider, AppProviders
constants/              # design-tokens.ts, nav.ts
types/                  # api.ts (contracts), common.ts
supabase/migrations/    # Schema + RLS
proxy.ts                # Route protection (Next 16's middleware)
```

## Conventions

- **Feature-first**: each route owns its `components/`, `service.ts` and
  `types.ts`. Components call `service.ts`, which calls the API — never a
  Supabase client directly.
- **One AI file**: only `lib/ai/groq.ts` talks to a model. Only
  `lib/supabase/*` constructs a Supabase client. Only `lib/server/*` is
  called by a route handler.
- **Contracts in one place**: `types/api.ts`. Change a field there and both
  sides get a type error.
- **Normalise model output** before it reaches a component. See the
  `normalise*` helpers in `lib/ai/report-generator.ts`.
- **No hardcoded colors/shadows/easing** — reach for a Tailwind token from
  `tailwind.config.ts` or a constant from `lib/motion.ts` /
  `constants/design-tokens.ts`. See `DESIGN_SYSTEM.md`.
- **Accessibility is not optional** — every interactive primitive ships
  focus-visible rings, ARIA wiring (via Radix where applicable), and
  `prefers-reduced-motion` handling.

## Scripts

```bash
npm run dev        # Dev server
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Known gaps

Listed at the end of [`BACKEND.md`](./BACKEND.md) — deck upload, billing
actions, and kanban drag-and-drop persistence are the notable ones.
# HackAgent
