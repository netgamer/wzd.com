# Task Template

## Goal

Reduce visual density in the mobile workspace top area and improve hierarchy without changing behavior.

## User-visible outcome

- `980px and below`: the workspace top area feels less crowded, with clearer reading order from title to key status to primary actions.
- `980px and below`: save-status messaging reads calmer and more trustworthy.

## In scope

- `src/App.tsx` mobile workspace header/top-area markup and save-status copy
- `src/styles/main.css` mobile workspace top-area and trust-bar styling

## Out of scope

- Desktop header redesign
- Board actions, save logic, or route behavior changes
- New controls, new actions, or feature additions
- Non-header surfaces outside the mobile workspace top area

## Risks

- Over-compressing the top area could hide hierarchy instead of improving it.
- Mobile-only layout changes could leak into tablet or desktop breakpoints.
- Softer save-state language could reduce urgency too much if error styling becomes too weak.

## Pass criteria

- `981px+`: existing workspace header behavior and action set remain intact.
- `980px and below`: mobile workspace top area reads in the order title, key status, then main actions.
- `980px and below`: mobile workspace top area uses lighter spacing and grouping so it feels less visually dense.
- `980px and below`: save-status messaging is calmer than before while still distinguishable across saving, saved, idle, and error states.
- Only `src/App.tsx` and `src/styles/main.css` change for the product surface.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` finds no blocking regressions on the touched mobile top area.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
