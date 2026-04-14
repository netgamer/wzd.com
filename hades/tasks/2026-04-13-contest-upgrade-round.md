# Task Template

## Goal

Make the landing page read more clearly as WZD's contest-positioned personalized bookmark + RSS first page by tightening the visible hero and sample mix.

## User-visible outcome

- The first screen and main preview read as a browser-first-page product, not a broad workspace or dashboard.
- Visible landing samples center on bookmarks, RSS, and a few everyday companion cards that support a personalized first page.
- The shareable-page section stays secondary and reads as an extension of the first-page story rather than the main product definition.

## In scope

- `src/features/landing/LandingPage.tsx`
- Contest-facing landing copy in the hero, preview, and related visible sample content
- Narrowing the rendered sample mix to reduce broad workspace/dashboard impressions

## Out of scope

- New widgets or new landing sections
- Board editor behavior or data model changes
- Market, agent, auth, or updates-hub feature work
- App-wide layout or navigation changes outside the landing page

## Risks

- Over-pruning visible samples could make the page feel too repetitive if bookmark/RSS support cards are not varied enough.
- Copy changes can drift from the current implementation if they imply features beyond the existing landing preview.

## Pass criteria

- `769px+`: the hero and visible preview read as a personalized first page for bookmarks and RSS, without overflow or generic workspace/dashboard framing.
- `521px-768px`: hero preset controls wrap cleanly and the visible sample board still prioritizes bookmark + RSS use cases over broad operations/team-work use cases.
- `520px and below`: hero copy remains scannable, preset controls stack cleanly, and the visible samples still feel like an everyday browser first page.
- The most visible sample mix is narrower than before and avoids pushing operations, team collaboration, or dashboard-like examples as the core story.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
