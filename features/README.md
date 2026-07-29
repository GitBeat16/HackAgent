# `features/`

Every route in the app owns a folder here: `dashboard`, `boardroom`,
`meeting-new`, `reports`, `market-research`, `financials`, `startup-health`,
`executives`, `pitch-deck`, `prd-generator`, `kanban`, `history`,
`settings`, `workspace`, `landing`. Each follows this shape:

```
features/reports/
  components/       # feature-only UI, composed from components/ui and components/shared
  service.ts        # the only file that talks to the API
  types.ts          # this feature's domain types (ReportDetail, SwotSection, RiskRow, ...)
```

## Data flow

```
component → features/<name>/service.ts → /api/... → lib/server/... → Supabase / Groq
```

A component never fetches directly and never imports a Supabase client.
Where several screens read the same payload they share one service and one
hook — `/api/workspace` is read through `hooks/use-workspace.ts` by
`financials`, `kanban`, `market-research`, `startup-health`, `prd-generator`,
`pitch-deck` and `settings`.

Features whose data is a single fetch keep that fetch in a page-level
`<Feature>Content` component and pass plain props down, so the leaf
components stay presentational. `features/boardroom` is the one worth
reading closely: `boardroom-session.tsx` owns the entire session state
machine and every other component in that folder is a pure render of props.

## What is not fetched

- `features/landing/mock.ts` — marketing copy for `/`, `/pricing` and
  `/about`. Static by intent; there is no reason for a database round-trip to
  render a testimonial.
- `features/executives/roster.ts` — the eight personas. Product
  configuration rather than user data, and the same array `/api/executives`
  serves. `lib/ai/executives.ts` holds their system prompts, keyed by the
  same ids.

Everything else comes from the API.

## Rules

- Feature components may import from `components/ui`, `components/shared`,
  `hooks/`, and `lib/` freely. They should **not** import from another
  feature's folder — shared logic that two features need belongs in
  `components/shared`, `hooks/`, or `lib/` instead. (Accepted exceptions
  today: `/pricing` and `/about` reuse sections from
  `features/landing/components/` since it's the same marketing content on a
  second route, and `features/boardroom` reads the executive roster.)
- Keep files small. If a feature's `components/` folder exceeds ~8 files,
  give it subfolders (e.g. `features/boardroom/components/transcript/`).
- `types.ts` models the API response shape. Cross-feature contracts live in
  `types/api.ts` instead, so a change there fails the build on both sides.
- **Never render un-normalised model output.** Components index into lookup
  tables by SWOT title, verdict, severity and risk level, so an unexpected
  string crashes a page. Normalisation belongs in `lib/ai/*`, not here.
