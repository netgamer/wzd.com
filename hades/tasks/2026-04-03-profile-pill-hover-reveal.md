## Goal

Make the desktop header profile control start as a single circular avatar and smoothly reveal the full email on hover.

## User-visible outcome

- On desktop, the header profile control initially appears as one round avatar.
- On hover or focus, it slides open to the right and reveals the full email naturally.

## In scope

- `src/App.tsx`
- `src/styles/main.css`

## Out of scope

- Mobile profile button behavior
- Profile menu contents or logout flow

## Risks

- Width animation could collide with nearby header actions on narrower desktop widths
- Email reveal could clip awkwardly if the transition is not constrained

## Pass criteria

- `981px+`: profile control starts as a circular avatar-only chip
- `981px+`: hover or focus smoothly expands the control and reveals the full email to the right
- `980px and below`: mobile profile button remains unchanged
- Existing profile menu open/close behavior still works
- `npm run build` passes
- `/gstack-review` finds no blocking issues
- `/gstack-qa-only` finds no blocking regressions on the touched header surface

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
