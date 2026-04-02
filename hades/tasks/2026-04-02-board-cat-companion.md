## Goal

Add a small roaming cat companion to the personal workspace board so it appears to wander through the spaces between cards.

## User-visible outcome

- The personal board shows one small animated cat moving through the board area.
- The cat feels decorative and does not block interaction with notes or widgets.

## In scope

- `src/App.tsx`
- `src/styles/main.css`
- Personal workspace board view only

## Out of scope

- Landing page
- Shared read-only board page
- Widget or note data behavior

## Risks

- The cat could overlap cards too aggressively and become distracting
- An overlay could accidentally block pointer interaction if layered incorrectly

## Pass criteria

- `981px+`: the personal workspace board shows one animated cat companion inside the board panel
- `981px+`: the cat stays visually behind cards so board interactions remain usable
- `980px and below`: the cat remains visible without breaking layout or covering controls
- The shared read-only board does not show the cat
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
