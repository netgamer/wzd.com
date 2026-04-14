## Goal

Make plain memo notes behave like text notes only, without automatic image cards or link preview cards.

## User-visible outcome

- Plain memo notes no longer render pasted images or URL preview cards.
- Links inside memo notes stay clickable and are shown with colored underlined text.
- Clicking a memo card opens editing instead of auto-opening the first link.

## In scope

- `src/App.tsx` plain memo rendering
- `src/App.tsx` memo editor paste/drop behavior
- `src/styles/main.css` inline memo link styling

## Out of scope

- Bookmark widget previews
- RSS, weather, profile, or other widget cards

## Risks

- Removing preview generation from plain notes could affect users who relied on image-like memo cards.

## Pass criteria

- Plain text memo notes render only text content.
- URLs inside plain memo notes are clickable inline links.
- Pasting or dropping an image into a plain memo editor does not create an image preview card.
- `npm run build` passes.

## Required checks

- `npm run build`
