# Task Template

## Goal

Restore mobile workspace board-content visibility and land the first narrow Pinterest-structure round so the selected board remains visible below a board-focused top area.

## User-visible outcome

- `980px and below`: after opening the workspace, the selected board's content is visibly rendered below the top area instead of appearing missing.
- `980px and below`: switching boards by tab or swipe keeps the current board content visible.
- `980px and below`: the top area stays focused on board selection instead of large control emphasis.
- `980px and below`: a basic bottom navigation shell exposes core workspace actions without covering board content.

## In scope

- `src/App.tsx` workspace layout structure around the mobile top area, board tabs, and main board stage
- `src/styles/main.css` mobile workspace top-area and board-stage layout/visibility CSS
- `src/App.tsx` mobile bottom navigation shell for the workspace surface
- `src/styles/main.css` bottom-safe-area spacing so the new shell does not cover board content

## Out of scope

- Desktop layout redesign
- Board data loading, save behavior, or route changes
- New data behaviors or control logic beyond reshaping existing workspace actions into the mobile shell
- Changes outside the touched board layout/header surface and related CSS

## Risks

- A mobile-only layout fix could accidentally affect desktop/tablet spacing if breakpoint scoping is weak.
- Restoring board-stage visibility could reintroduce the extra top-area height from the previous cleanup round if the fix is too broad.
- Flex/overflow fixes can create nested scroll regressions if applied to the wrong container.
- A fixed mobile bottom shell can hide the last row of content if bottom spacing is undersized.

## Pass criteria

- `981px+`: existing board workspace layout and interactions remain unchanged.
- `980px and below`: the current board content is clearly visible directly below the mobile top area and board tabs.
- `980px and below`: selecting or swiping to another board still shows that board's content without the panel appearing hidden or collapsed.
- `980px and below`: title and core workspace controls remain available after the top area is simplified.
- `980px and below`: the mobile bottom navigation shell stays visible without covering board content.
- Only `src/App.tsx` and `src/styles/main.css` change for the product surface.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` finds no blocking regressions on the touched mobile board surface.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
