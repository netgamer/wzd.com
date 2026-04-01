# Task

## Goal

Reduce the main frontend bundle size by splitting large UI flows into separate chunks.

## User-visible outcome

- Initial page load stays functionally identical
- Large secondary UI flows load on demand
- Build warning for oversized main chunk is reduced or eliminated

## In scope

- Frontend code splitting in [App.tsx](C:\Users\junho\Documents\code\wzd.com\src\App.tsx) and supporting modules
- Vite/Rollup chunking adjustments if needed
- Lazy-loading non-critical panels, overlays, or heavy views

## Out of scope

- Visual redesign
- Backend/API behavior changes
- Replacing the current app architecture wholesale

## Risks

- Lazy-loaded paths may flash or fail without proper fallback UI
- Over-splitting can increase request count and hurt perceived performance
- Large single-file app structure may limit easy split points

## Pass criteria

- `npm run build` passes
- Main bundle warning is reduced or removed
- App still loads and navigates correctly through primary board flow
- No user-visible regression in initial render
- `/gstack-review` finds no blocking issue
- `/gstack-benchmark` confirms no obvious performance regression

## Required checks

- `npm run build`
- `/gstack-review`
- `/gstack-benchmark`
