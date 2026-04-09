## Goal

Show the board shell first on signed-in workspace entry, then fill note content in progressively.

## User-visible outcome

- The selected board header and frame appear before note content finishes loading.
- Note content can populate after the shell is already visible instead of blocking the whole page.
- If a local snapshot exists, the last seen workspace state appears immediately before remote sync completes.

## In scope

- `src/App.tsx` signed-in workspace loading flow
- Progressive first-board note hydration
- Loading state split between page shell and board content

## Out of scope

- Shared board and home board route behavior
- New API endpoints
- Widget-specific network optimizations

## Risks

- If note hydration state is wrong, an empty board message could flash before notes arrive.
- Autosave must stay blocked while background hydration is incomplete.

## Pass criteria

- `981px+`: signed-in workspace shows the selected board shell before first-board note content finishes loading.
- `981px+`: first-board notes appear after shell render without a full-page blocking overlay.
- `981px+`: when a local snapshot exists, the previous workspace appears immediately on entry.
- `981px+`: switching to an unloaded board still loads its notes.
- `980px and below`: the same progressive loading behavior works without overflow or empty-state flicker.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
