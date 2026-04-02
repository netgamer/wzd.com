## Goal

Redirect authenticated users from the root home URL directly into the workspace instead of showing the starter home board.

## User-visible outcome

- Logged-in users opening `wzd.kr` land in the workspace immediately.
- Anonymous users still see the public home flow.

## In scope

- `src/App.tsx`

## Out of scope

- Public home page content
- Shared board URLs
- Auth provider behavior

## Risks

- Redirecting too early could interfere with pending auth hash resolution
- Redirecting broad home routes could accidentally affect shared/read-only entry flows

## Pass criteria

- Logged-in users visiting `/` are redirected to `/#` after auth resolution
- Anonymous users visiting `/` still see the public home view
- Shared board and read-only routes keep existing behavior
- `npm run build` passes
- `/gstack-review` finds no blocking issues
- `/gstack-qa-only` finds no blocking regressions on the touched entry flow

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
