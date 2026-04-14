## Goal

Hide the desktop workspace board tabs while scrolling down so they do not keep covering the content.

## User-visible outcome

- Desktop workspace board tabs disappear when the user scrolls downward.
- The tabs reappear when the user scrolls upward or returns near the top.

## In scope

- `src/App.tsx` workspace scroll detection
- `src/styles/main.css` board tab hide/show transition

## Out of scope

- Mobile board sheet behavior
- Changes to board tab copy or styling

## Risks

- Aggressive scroll detection could make the tabs flicker during small movements.

## Pass criteria

- `981px+`: workspace board tabs hide while scrolling down past the top area.
- `981px+`: workspace board tabs reappear when scrolling up.
- `980px and below`: mobile board tabs behavior remains unchanged.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
