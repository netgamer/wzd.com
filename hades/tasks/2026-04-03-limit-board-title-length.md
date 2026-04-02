## Goal
Limit board title length and prevent long board names from breaking the workspace header.

## User-visible outcome
- Board titles stop at a defined maximum length when edited.
- Long board titles in the workspace header are truncated instead of overlapping header actions.

## In scope
- src/App.tsx board title update and edit inputs.
- src/styles/main.css workspace header title overflow handling.

## Out of scope
- Changing note title limits.
- Renaming existing seeded board titles unless truncation is purely visual.

## Risks
- Title truncation rules can conflict with existing edit flows.
- A visual-only fix without input limits would still allow broken data.

## Pass criteria
- 981px+: excessively long board titles do not overlap header buttons and display with ellipsis.
- 980px and below: long mobile board titles stay within the mobile header without overflow.
- Board title editing cannot save titles longer than the chosen limit.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies long board titles stay contained.

## Required checks
- `npm run build`
- `/gstack-review`

## Extra checks if applicable
- `/gstack-qa-only`
