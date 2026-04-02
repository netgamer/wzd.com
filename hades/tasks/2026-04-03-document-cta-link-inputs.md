## Goal
Allow document section buttons to store and use destination URLs from the editor.

## User-visible outcome
- Document section editing shows input fields for each CTA button URL.
- Clicking document CTA buttons opens the configured destination URL.

## In scope
- src/App.tsx document note editor fields and CTA rendering.
- Any related type or metadata handling for document CTA URLs.
- Minimal style updates in src/styles/main.css if new inputs need layout support.

## Out of scope
- Rich HTML editing for document body content.
- Changes to non-document note buttons.

## Risks
- Existing document notes may have empty CTA URLs and need safe fallback behavior.
- CTA rendering differs by document variant, so URL handling must stay aligned with each visible button.

## Pass criteria
- Document note editor shows separate URL inputs for primary and secondary CTA buttons when those buttons are present.
- Clicking a populated document CTA opens the configured URL.
- Empty CTA URLs do not break rendering and behave as non-link buttons or stay inert.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies editing and clicking document CTA links.

## Required checks
- `npm run build`
- `/gstack-review`

## Extra checks if applicable
- `/gstack-qa-only`
