## Goal

Replace the floating board cat with a desktop-pet style blue cat that walks, clings to memo edges, and drops through the workspace like the original `파란고양이.exe`.

## User-visible outcome

- The personal workspace board shows a blue cat companion that actually behaves like a small desktop pet instead of floating in place.
- The cat walks along board surfaces, clings to note edges, and drops back down through memo gaps.

## In scope

- `src/App.tsx`
- New board cat behavior component under `src/components/`
- `src/styles/main.css`
- Web-ready blue cat sprite sheet asset extracted from `파란고양이.exe`
- Task record for this behavior work

## Out of scope

- Landing page or shared board pets
- Click interactions, sounds, or multiple pets
- Perfect one-to-one recreation of every original EXE animation state

## Risks

- Bad frame selection could make the cat look broken instead of playful
- DOM-measured board motion could jitter on resize or while notes reflow
- The pet could overlap card content if ledges and cling points are wrong

## Pass criteria

- `981px+`: personal workspace board shows the blue cat walking on available ledges, clinging to at least one note edge, and dropping back down without covering core text content
- `980px and below`: the cat remains visible, scaled down, and does not break board layout
- Home landing and read-only/shared board views do not render the cat companion
- The cat uses extracted sprite frames from `파란고양이.exe`, not a static cutout or emoji fallback
- `npm run build` passes
- `/gstack-review` finds no blocking issues
- `/gstack-qa-only` finds no blocking regressions on the touched board surface

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
