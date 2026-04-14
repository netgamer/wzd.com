## Goal

Add a global Korean/English toggle that is visible across the product and wire it into standalone content pages.

## User-visible outcome

- A persistent Korean/English toggle is visible on all major routes.
- The selected language persists between page loads.
- Insight and Updates pages switch their static UI labels between Korean and English.

## In scope

- `src/App.tsx`
- `src/lib/site-language.ts`
- `src/features/insight/InsightReaderPage.tsx`
- `src/features/updates/UpdatesIndexPage.tsx`
- `src/features/updates/UpdateDetailPage.tsx`
- `src/styles/main.css`

## Out of scope

- Full translation of every board widget and editable user content
- Landing page body copy localization

## Risks

- A floating global control could overlap page actions if not placed carefully.
- Partial localization may create mixed-language screens on content-heavy board routes.

## Pass criteria

- `981px+`: Korean/English toggle is visible on landing, workspace, insight, and updates routes.
- Language choice persists on reload.
- `/insight` and `/updates` switch their static UI labels with the toggle.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
