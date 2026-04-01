# Hades Loop

This repo uses a three-role delivery loop:

1. Planner
2. Builder
3. Verifier

The loop is not complete until the verifier passes.

## Roles

- Planner: defines the goal, scope, non-scope, and pass criteria.
- Builder: changes code only inside the approved scope.
- Verifier: rejects work that does not meet the pass criteria or causes regressions.

## Required sequence

1. Create a task file from [task-template.md](C:\Users\junho\Documents\code\wzd.com\hades\task-template.md)
2. For product-facing work, run the gstack planning sequence first:
   - [office-hours](C:\Users\junho\Documents\code\wzd.com\hades\reviews\2026-04-01-office-hours.md)
   - [ceo-review](C:\Users\junho\Documents\code\wzd.com\hades\reviews\2026-04-01-ceo-review.md)
   - [eng-review](C:\Users\junho\Documents\code\wzd.com\hades\reviews\2026-04-01-eng-review.md)
   - [design-review](C:\Users\junho\Documents\code\wzd.com\hades\reviews\2026-04-01-design-review.md)
3. Planner fills in goal, scope, success criteria, and test conditions
4. Builder implements
5. Verifier runs local checks and gstack review
6. If verifier fails, return to builder
7. Only merge or deploy after verifier passes

## Verifier stack

The verifier uses repo-local `gstack` installed at `.agents/skills/gstack`.

Use these Codex skills:

1. `/gstack-review`
2. `/gstack-qa-only`
3. `/gstack-benchmark`
4. `/gstack-cso`

## Minimum gate

Every code change must pass:

1. `npm run build`
2. `/gstack-review`

UI changes must also pass:

1. `/gstack-qa-only`

Public page, auth, API, payment, or storage changes should also run:

1. `/gstack-cso`

Performance-sensitive UI changes should also run:

1. `/gstack-benchmark`

## Stop conditions

Do not continue the loop if:

1. The working tree has unresolved conflicts
2. The planner task file has no concrete pass criteria
3. The verifier reports a blocking issue

## Current install

- Repo-local gstack source: `.agents/skills/gstack`
- Generated Codex skills: `.agents/skills/gstack-*`
