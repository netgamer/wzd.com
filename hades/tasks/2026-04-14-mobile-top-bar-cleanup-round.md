# Task Template

## Goal

Restore clear mobile board-title and core menu-control visibility while reducing wasted workspace top-area height without changing behavior.

## User-visible outcome

- `980px and below`: the current board title is clearly readable again at first glance.
- `980px and below`: the core mobile menu/control cluster is clearly visible again without making the top area feel crowded.
- `980px and below`: the workspace top area uses less wasted vertical space so board content starts sooner.

## In scope

- `src/App.tsx` mobile workspace header/top-area markup
- `src/styles/main.css` mobile workspace top-area, compact-header, and related board-tab styling

## Out of scope

- Desktop header redesign
- Board actions, save logic, or route behavior changes
- New controls, new actions, or feature additions
- Non-header surfaces outside the mobile workspace top area

## Risks

- Over-compressing the top area could hide hierarchy instead of improving it.
- Restoring menu/control visibility could make the compact header feel busy again if grouping is weak.
- Mobile-only layout changes could leak into tablet or desktop breakpoints.

## Pass criteria

- `981px+`: existing workspace header behavior and action set remain intact.
- `980px and below`: the current board title is clearly visible without being squeezed behind the mobile controls.
- `980px and below`: the board/menu toggle and core mobile action controls are clearly visible again.
- `980px and below`: the mobile workspace top area is less vertically wasteful than the previous cleanup round.
- Only `src/App.tsx` and `src/styles/main.css` change for the product surface.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` finds no blocking regressions on the touched mobile top area.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
