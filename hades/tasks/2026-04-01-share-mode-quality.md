# Task: Improve share mode quality

## Goal

Make read-only share and home views feel more like a polished public page and less like an editing workspace.

## User-visible outcome

- Shared boards feel calmer and more intentional.
- Public/home views surface title and description with stronger hierarchy.
- The page frame feels like a reading surface, not a private workspace with controls removed.

## In scope

- Read-only page chrome and layout styling
- Share/home header hierarchy
- Sidebar and topbar presentation in public modes
- Spacing and width adjustments for read-only board views

## Out of scope

- Card redesign
- Board data model changes
- App.tsx deep refactor

## Risks

- Read-only layout can accidentally affect edit mode.
- Mobile share layout can regress if spacing rules are too aggressive.

## Pass criteria

- Edit board mode remains visually unchanged.
- Shared and home boards visibly differ from edit mode.
- Title and description hierarchy improves in read-only mode.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
