## Goal
Remove the auto organize button from the workspace header status bar.

## User-visible outcome
- The workspace status chip row no longer shows the auto organize icon button.

## In scope
- src/App.tsx trust-bar action rendering.
- src/styles/main.css cleanup for auto organize button styles if they become unused.

## Out of scope
- Changes to the auto organize feature itself.
- Changes to board settings or organize logic.

## Risks
- Removing the button can leave spacing artifacts in the status chip row.
- Unused styles can remain if not cleaned up.

## Pass criteria
- 981px+: workspace status chip row shows save state and counts, without the auto organize button.
- 980px and below: mobile workspace header and status chips render without the auto organize button.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies the auto organize button is gone from the workspace header.

## Required checks
- `npm run build`
- `/gstack-review`

## Extra checks if applicable
- `/gstack-qa-only`
