## Goal

Make notes that contain both an attached screenshot and an external link render like a normal card instead of a broken image hero card.

## User-visible outcome

- Screenshot + link notes keep edit/delete controls in the top card bar.
- Their title is readable in the body instead of being clipped into the image caption treatment.

## In scope

- `src/App.tsx` note rendering rules for attached-image link notes
- `src/styles/main.css` layout for stacked screenshot + link note cards

## Out of scope

- Pure image note layout
- Bookmark widget card layout
- Shared-board readonly behavior changes

## Risks

- The special-case selector could accidentally affect normal image notes if the class is applied too broadly.
- Hiding nested preview images for attached screenshots could make some cards feel less rich if the screenshot is low quality.

## Pass criteria

- `981px+`: notes with both an attached screenshot and a link show controls in the top card bar.
- `981px+`: the note title is fully readable and not clipped into the screenshot overlay.
- `981px+`: the card does not render two stacked images for the same link.
- `980px and below`: the same note type keeps readable spacing and no overflow regression.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
