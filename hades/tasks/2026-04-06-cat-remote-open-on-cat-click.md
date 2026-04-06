## Goal

Hide the cat remote by default, open it only when the user clicks the cat, and allow closing it with an explicit X button.

## User-visible outcome

- The cat remote does not show on first load.
- Clicking the cat opens the remote.
- The X button closes the remote.
- Switching boards or feed mode closes the remote again.

## In scope

- `src/App.tsx`
- `src/components/BoardCatCompanion.tsx`
- `src/styles/main.css`

## Out of scope

- Changing remote command types
- Changing cat movement behavior

## Risks

- Making the cat clickable must not block board interactions outside the cat hitbox.

## Pass criteria

- Clicking the cat opens the remote.
- The remote can be closed with X.
- The remote starts hidden again after a board switch.
- `npm run build` passes.

## Required checks

- `npm run build`

## Extra checks if applicable

- `/gstack-review`
- `/gstack-qa-only`
