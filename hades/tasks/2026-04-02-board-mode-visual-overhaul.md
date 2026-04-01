# Task: Make board mode visually unmistakable

## Goal

Make the `/#workspace` board mode read as a deliberate workspace surface instead of a lightly polished default board.

## User-visible outcome

- Workspace mode has a clearly different frame, action rail, and board canvas from home/share mode.
- The top area looks intentionally designed at a glance, not like the previous layout with slightly softer borders.
- Cards feel heavier and more premium in workspace mode through stronger spacing, contrast, and depth.

## In scope

- `src/styles/main.css` workspace-only styling for sidebar, topbar, feed header, board canvas, and cards
- Responsive workspace adjustments for `981px+`, `980px and below`, and `680px and below`

## Out of scope

- Board data model changes
- Widget behavior changes
- Home/share mode structural rewrites

## Risks

- Workspace-only selectors can accidentally leak into home/share mode if they are too broad.
- Stronger topbar and canvas framing can reduce usable space on smaller widths.
- More dramatic shadows or gradients can hurt readability if chip and card contrast is not rebalanced.

## Pass criteria

- `981px+`: workspace mode has a visibly stronger shell than the previous version, with a distinct top action rail and framed board canvas.
- `981px+`: sidebar, topbar, and cards feel like the same visual system instead of three loosely related pieces.
- `980px and below`: workspace controls remain readable and wrapped without overlap.
- `680px and below`: workspace cards remain comfortable to scan and the top action rail does not collapse awkwardly.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` shows the workspace mode change is visually obvious on desktop and mobile.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
