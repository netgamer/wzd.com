# Task Template

## Goal

Add a narrow product-facing insight-reader MVP route that renders a WZD-style first page from the Supabase RPC function `get_home_payload` without redesigning the rest of the app.

## User-visible outcome

- Visitors can open a dedicated insight route and see a readable first-page style summary fed by `get_home_payload`.
- The surface feels like a lightweight WZD reading page, not a board editor, market page, or new widget system.

## In scope

- `src/App.tsx` route wiring for a new public insight-reader path
- `src/features/insight/InsightReaderPage.tsx`
- `src/lib/supabase-home-payload.ts`
- `src/styles/main.css` styles for the new insight-reader surface
- Rendering the explicit `hero`, `trends`, `feed`, `rediscovery`, and `actions` slices returned by `get_home_payload`

## Out of scope

- Board editor behavior
- Landing page redesign
- Market, agent, or new-widget work
- Supabase schema or SQL changes
- New auth or persistence flows beyond reading `get_home_payload`
- Any change to market, agent, share, or unrelated widget systems

## Risks

- The RPC payload shape may differ from assumptions, so the reader must degrade gracefully instead of failing hard.
- A new public route can accidentally inherit workspace or landing styling if selectors are too broad.

## Pass criteria

- `981px+`: `/insight` renders a clear first-page style layout with a hero summary, trends rail, feed list, rediscovery block, and actions block without workspace chrome or overflow.
- `681px-980px`: `/insight` collapses into a comfortable stacked reading layout without clipped cards or broken spacing.
- `680px and below`: `/insight` remains readable on mobile, with stable spacing and tappable links.
- When `get_home_payload` succeeds, the page renders meaningful hero, trends, feed, rediscovery, and actions content from the payload.
- When Supabase is unavailable or the payload is sparse, the page shows a useful empty/error state instead of crashing.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies the new route reads correctly.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-cso`
