## Goal

Keep the selected board tab visible in the mobile board tab strip on first entry and after swipe navigation.

## User-visible outcome

- On mobile, the active board chip in the horizontal tab list is automatically scrolled into view when the workspace opens.
- Swiping left or right to another board also keeps the newly selected board chip visible.

## In scope

- `src/App.tsx`

## Out of scope

- Desktop sidebar behavior
- Mobile board switching logic beyond tab visibility

## Risks

- Auto-scrolling the tab strip too aggressively could feel jumpy
- A missing ref cleanup could target stale elements after board list updates

## Pass criteria

- `980px and below`: opening the workspace auto-scrolls the board tab strip so the selected board chip is visible
- `980px and below`: swiping to the next or previous board auto-scrolls the board tab strip so the new selected board chip is visible
- `981px+`: desktop board navigation remains unchanged
- `npm run build` passes
- `/gstack-review` finds no blocking issues
- `/gstack-qa-only` finds no blocking regressions on the touched mobile board navigation surface

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
