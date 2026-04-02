## Goal

Restore the last viewed workspace board when a user re-enters the workspace.

## User-visible outcome

- Returning to the workspace reopens the board the user last viewed instead of always selecting the first board.

## In scope

- `src/App.tsx`

## Out of scope

- Shared/read-only board routing
- Server-side persistence of board selection

## Risks

- A stale stored board id could point to a deleted board
- Redirect and initial workspace load could race with board restoration if the selection is applied too early

## Pass criteria

- `981px+`: logged-in users returning to the workspace restore the last viewed active board when it still exists
- `980px and below`: the same last-viewed board restore behavior applies on mobile workspace
- If the stored board id no longer exists, the app falls back to the existing first-available-board behavior
- Shared/read-only routes keep current behavior
- `npm run build` passes
- `/gstack-review` finds no blocking issues
- `/gstack-qa-only` finds no blocking regressions on the touched workspace entry flow

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
