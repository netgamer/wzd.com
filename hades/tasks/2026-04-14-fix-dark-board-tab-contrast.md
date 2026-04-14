## Goal

Restore board tab readability on dark workspace themes.

## User-visible outcome

- Workspace board names remain readable on dark themes.
- The active board underline stays visible against dark backgrounds.

## In scope

- `src/styles/main.css` workspace board tab color styling

## Out of scope

- Board tab layout
- Mobile board tab redesign
- Card or sidebar theme changes

## Risks

- Raising contrast too much could feel heavy on light themes.

## Pass criteria

- `981px+`: board tab labels are readable on both light and dark workspace themes.
- `981px+`: the active board underline remains visible on both light and dark workspace themes.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
