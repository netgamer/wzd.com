## Goal
Make the top-left W brand button open the public WZD landing page even for signed-in users.

## User-visible outcome
- Clicking the top-left W button opens the same public landing page anonymous visitors see on wzd.kr.
- Signed-in users can view that landing page without being auto-redirected back to the workspace.

## In scope
- src/App.tsx routing state and brand-button navigation for the public landing page.
- A dedicated landing-page route or state that bypasses the signed-in home-to-workspace redirect.

## Out of scope
- Changes to landing page content or workspace board behavior.
- Changes to auth flow beyond allowing signed-in users to view the public landing page from the W button.

## Risks
- Route state can conflict with existing home-board and shared-board logic.
- Signed-in redirects can accidentally still fire and bounce the user away from the landing page.

## Pass criteria
- Signed-out users at `/` still see the public landing page.
- Signed-in users clicking the top-left W button see the public landing page instead of the workspace board.
- Signed-in users are still redirected from the old home-board route to `/#` when applicable.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies the W button opens the public landing page.

## Required checks
- `npm run build`
- `/gstack-review`

## Extra checks if applicable
- `/gstack-qa-only`
