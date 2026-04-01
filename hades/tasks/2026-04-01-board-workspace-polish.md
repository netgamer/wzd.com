# Task: Polish board workspace UI

## Goal

Improve the editing workspace UI so the board feels more intentional, premium, and readable without changing functionality.

## User-visible outcome

- Edit mode header has stronger hierarchy.
- The workspace has a framed board surface instead of feeling flat.
- Cards feel more polished through spacing, shadow, and type improvements.

## In scope

- Edit-mode topbar styling
- Board workspace frame styling
- Card surface, spacing, and typography polish
- No behavior change

## Out of scope

- Share page redesign
- Card content logic changes
- Mobile navigation rewrites

## Risks

- Over-styling can reduce information density.
- Board frame styles can conflict with mobile breakpoints.

## Pass criteria

- Edit mode visually improves while preserving current behavior.
- Share/home mode styling remains intact.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
