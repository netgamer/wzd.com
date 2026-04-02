## Goal

Add an explicit sidebar toggle button so the desktop left rail can be collapsed and expanded on demand.

## User-visible outcome

- Desktop users can click a dedicated button in the sidebar to collapse or expand the side menu.
- The toggle remains visible in both collapsed and expanded states.

## In scope

- `src/App.tsx`
- `src/styles/main.css`

## Out of scope

- Mobile sidebar behavior
- Board selection or drag-and-drop behavior beyond removing accidental collapse triggers

## Risks

- The toggle could be too subtle in the collapsed rail
- Existing click-to-toggle behavior on the selected board chip could conflict with the new button

## Pass criteria

- `981px+`: a dedicated sidebar toggle button is visible in the left rail
- `981px+`: clicking the button collapses and expands the sidebar without breaking board switching
- `981px+`: board chips keep working for navigation and no longer collapse the sidebar by accidental board clicks
- `980px and below`: mobile layout remains unchanged
- `npm run build` passes
- `/gstack-review` finds no blocking issues
- `/gstack-qa-only` finds no blocking regressions on the touched sidebar surface

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
