## Goal

Prevent pure link notes from looking broken when generic webpage preview images duplicate the title and crush text into a tiny screenshot.

## User-visible outcome

- Pure link notes for regular webpages render as cleaner text-first cards instead of tiny screenshot cards.
- Media-style links such as YouTube and Instagram still keep image-led preview behavior.

## In scope

- `src/App.tsx` pure link preview rendering rules in board and swipe preview surfaces

## Out of scope

- Bookmark widget preview behavior
- Link preview fetching or server-side metadata generation

## Risks

- The heuristic could hide useful preview images for some non-media sites.
- Board preview and main board could diverge if both render paths are not updated together.

## Pass criteria

- `981px+`: regular webpage pure link notes no longer render as tiny screenshot-heavy cards.
- `981px+`: YouTube and Instagram links still render with image previews.
- `980px and below`: link cards remain readable and do not overflow.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
