## Goal

Show a thumbnail for YouTube link cards when the generic link preview response does not include one.

## User-visible outcome

- YouTube link notes and bookmark cards render a video thumbnail instead of a text-only preview.

## In scope

- `src/lib/link-preview.ts`

## Out of scope

- Non-YouTube provider-specific preview rules
- Server-side link preview changes

## Risks

- Incorrect video id parsing could generate broken thumbnails for uncommon YouTube URLs
- A fallback thumbnail could override a valid preview image if the condition is too broad

## Pass criteria

- Standard `youtube.com/watch?v=...` links produce a thumbnail URL when preview metadata lacks `image`
- Short `youtu.be/...` links also produce a thumbnail URL when preview metadata lacks `image`
- Non-YouTube links keep existing preview behavior
- `npm run build` passes
- `/gstack-review` finds no blocking issues
- `/gstack-qa-only` finds no blocking regressions on the touched link-card surface

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
