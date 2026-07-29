# BoardroomAI Design System — "Ink & Brass" (v1.0)

This is the design language for the whole product, encoded in
`tailwind.config.ts` and `app/globals.css`. Every component in
`components/ui` and `components/shared` is built strictly from these
tokens — no component should hardcode a hex value, a one-off shadow, or an
ad-hoc easing curve.

## Why "Ink & Brass"

BoardroomAI's subject is a boardroom, not a startup's beanbag lounge. Two
of the most common AI-generated design defaults right now are a cream
background with a terracotta accent, and a near-black background with a
single acid-green accent. Neither says "boardroom." Instead:

- **Background** is a tinted ink-navy (`hsl(224 24% 7%)`), never true
  black — a real room has depth and reflected light, not a void.
- **Primary accent (brass)** is a desaturated warm metal
  (`hsl(32 42% 58%)`) — nameplates, fountain pens, table trim. It reads as
  *institutional*, not playful.
- **Secondary accent (signal)** is a cool blue (`hsl(217 79% 66%)`),
  reserved **exclusively** for anything AI-originated: agent avatars,
  "speaking" states, live indicators, generated-copy call-outs. This gives
  the interface a consistent tell for "a machine produced this," which
  matters a lot in a product where AI executives generate reports a human
  founder will read as if from a real board.

## Palette

| Token | Value (HSL) | Use |
|---|---|---|
| `--background` | `224 24% 7%` | App background |
| `--surface` | `222 20% 10%` | Card/panel base |
| `--surface-elevated` | `222 18% 13%` | Nested surfaces, hovers |
| `--surface-overlay` | `222 20% 15%` | Popovers, tooltips, dropdowns |
| `--brass` (primary) | `32 42% 58%` | Primary actions, brand, active nav |
| `--signal` | `217 79% 66%` | AI/agent-originated content only |
| `--success` / `--warning` / `--destructive` | `152 48% 45%` / `38 88% 58%` / `356 72% 58%` | Semantic states |
| `--border` / `--border-strong` | `222 16% 20%` / `222 16% 28%` | Hairlines, dividers |

A light theme (`.light` class) exists at the same hue anchors for
accessibility preference, but dark is the default and the showcase
surface — see `app/globals.css` for both definitions.

## Typography

Two roles, deliberately paired (see `lib/fonts.ts`):

- **Display — Fraunces**: a soft, high-contrast serif with real optical-size
  variation. Headlines and big figures only. Never body copy, never UI
  chrome.
- **Sans — Inter**: neutral, dense-friendly grotesk for UI labels, nav,
  forms, and body copy — chosen for legibility at small sizes across a
  data-heavy dashboard.
- **Mono — JetBrains Mono**: reserved for anything that must read as *data*
  — financial figures, timestamps, IDs, deltas (`MetricCard` and
  `ScoreCard` both set their headline figure in mono).

Type scale is a hand-tuned 1.25 ratio (`text-xs` → `text-7xl` in
`tailwind.config.ts`), not a generic `clamp()`.

## Signature element — the Roundtable Ring

The one visual idea this product should be remembered by: every verdict a
board of executives produces (investment score, confidence, health) is a
number out of 100, and it is always drawn as a **radial ring**, echoing the
shape of the boardroom table itself. `ScoreCard` is the full-size version;
`AvatarPresenceRing` is the same idea compressed down to an executive's
presence indicator. The motif recurs across the product instead of being a
one-off hero graphic.

## Elevation & materials

- **Shadows** (`shadow-xs` → `shadow-xl`) are tinted with `--shadow-color`,
  not pure black, so elevation reads correctly on the ink background.
- **Glass** (`.glass`, `.glass-elevated`) is reserved for navigation,
  dialogs/drawers, and one hero moment per page — never applied to every
  card, or the "premium" material stops reading as premium.
- **Grain** (`.grain`) is an optional overlay for large gradient surfaces
  (hero sections, empty states) so brass/signal glows don't look like flat
  digital gradients.

## Motion principles

Centralized in `lib/motion.ts` so every entrance/stagger/hover animation in
the app shares the same two easing curves:

- `EMPHASIZED_EASE` (`cubic-bezier(0.16, 1, 0.3, 1)`) — entrances, the
  Roundtable Ring's fill animation, dialogs.
- `STANDARD_EASE` (`cubic-bezier(0.4, 0, 0.2, 1)`) — hovers, toggles, exits.

`useReducedMotion` + `withReducedMotion` collapse any variant to
opacity-only when the OS preference is set; this is wired at the token
level, not left to each component to remember.

## Spacing & radius

- Spacing is the default Tailwind 4px scale plus a few "air" steps
  (`18`–`34`) for section rhythm on long dashboard pages, so layouts don't
  rely on ad-hoc `py-24`-style one-offs.
- Radius is a single `--radius` var (`0.875rem`) with `xs`–`3xl` derived
  from it — changing the product's "roundedness" is a one-line edit.

## Component inventory (this phase)

**Primitives** (`components/ui`): Button, Input, Textarea, Label, Card,
Badge, Avatar (+ `AvatarPresenceRing`), Tooltip, Dialog, Drawer, Separator,
Skeleton (+ `SkeletonCard`, `SkeletonRow`).

**Composed / shared** (`components/shared`): SectionHeader, MetricCard,
ScoreCard, ExecutiveCard, Timeline, ChartWrapper, BoardroomRadarChart,
EmptyState, ErrorState.

**Layout** (`components/layout`): Sidebar, Navbar.

Pages, features, and mock data are intentionally **not** built yet — see
the root `README.md` for what's next.
