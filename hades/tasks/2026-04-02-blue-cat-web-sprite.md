## Goal

Extract the animated blue cat from `파란고양이.exe` and replace the placeholder board cat with a sprite-based web companion that roams the personal workspace board.

## User-visible outcome

- The personal workspace board shows a blue cat companion that looks like the original desktop pet instead of a generic emoji cat.
- The cat animation feels like a sprite-based desktop pet and stays visually behind notes/widgets.

## In scope

- `src/App.tsx`
- `src/styles/main.css`
- New extracted web-ready cat sprite assets under `public/` or `src/assets/`
- Task record for this extraction and integration work

## Out of scope

- Running the downloaded EXE
- Adding multiple pets or pet interactions
- Changing landing page content or shared/read-only board behavior

## Risks

- Sprite extraction may leave visible background artifacts or mask issues
- Large sprite assets could bloat the board payload if not trimmed
- Animation could overlap cards if positioning is not constrained

## Pass criteria

- `981px+`: personal workspace board shows a blue cat sprite moving through the board gutter area without covering note content
- `980px and below`: cat remains visible but scaled down and does not break board layout
- Home landing and read-only board views do not show the cat companion
- Extracted sprite uses the original blue cat art from `파란고양이.exe`, not the emoji fallback
- `npm run build` passes
- `/gstack-review` finds no blocking issues

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
