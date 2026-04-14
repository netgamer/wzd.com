## Goal

Reduce workspace card top spacing further and keep hover actions aligned to the right edge.

## User-visible outcome

- Workspace cards start closer to the top edge with less dead space.
- Hover action buttons appear aligned to the top-right corner.

## In scope

- `src/styles/main.css` workspace card head, body, and action alignment

## Out of scope

- Share/home card chrome
- Widget body internals
- Image note overlay actions

## Risks

- Tight card chrome could crowd controls on smaller cards.

## Pass criteria

- `981px+`: workspace card content starts higher with visibly reduced top padding.
- `981px+`: hover actions are right-aligned on workspace cards.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
