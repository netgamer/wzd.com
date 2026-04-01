# Task: Refresh overall mode design

## Goal

Make WZD feel intentionally different in home, share, and edit modes without changing the underlying board behavior.

## User-visible outcome

- Home mode reads like a product landing page with a stronger hero and calmer spacing.
- Share mode feels editorial and trustworthy instead of like edit mode with controls removed.
- Edit mode keeps its fast workspace feel but gains a more deliberate board frame and stronger hierarchy.

## In scope

- `src/App.tsx` layout wrappers and mode-specific header/feed markup
- `src/styles/main.css` mode-specific visual system, spacing, backgrounds, and card presentation
- Responsive styling for `981px+`, `980px and below`, and `680px and below`

## Out of scope

- Board data model changes
- Widget logic changes
- Large component extraction beyond the minimum markup needed for styling

## Risks

- Shared CSS selectors can accidentally blur the boundaries between modes.
- Read-only pages can regress on mobile if the new hero spacing is too large.
- Small markup changes in `App.tsx` can affect card layout if selectors are too broad.

## Pass criteria

- `981px+`: home, share, and edit views each have clearly different page framing and header hierarchy.
- `981px+`: edit mode preserves search, trust chips, and board controls while feeling more intentional.
- `981px+`: share and home modes present the title, description, and metadata as a public-facing hero instead of editor chrome.
- `980px and below`: mobile top area stays readable and does not collapse into overlapping controls.
- `680px and below`: cards remain single-column and public-mode spacing stays comfortable for feed reading.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
