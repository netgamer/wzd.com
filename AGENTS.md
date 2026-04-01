# Project Agent Guide

## Hades

Use the Hades loop for all non-trivial changes:

1. Planner
2. Builder
3. Verifier

Read these files first:

1. [HADES.md](C:\Users\junho\Documents\code\wzd.com\HADES.md)
2. [planner.md](C:\Users\junho\Documents\code\wzd.com\hades\planner.md)
3. [builder.md](C:\Users\junho\Documents\code\wzd.com\hades\builder.md)
4. [verifier.md](C:\Users\junho\Documents\code\wzd.com\hades\verifier.md)

Always create or update a task file from:

- [task-template.md](C:\Users\junho\Documents\code\wzd.com\hades\task-template.md)

## gstack

Repo-local gstack is installed in:

- `.agents/skills/gstack`

Generated Codex skills are installed in:

- `.agents/skills/gstack-review`
- `.agents/skills/gstack-qa-only`
- `.agents/skills/gstack-benchmark`
- `.agents/skills/gstack-cso`

For verification:

1. Use `/gstack-review` for code review
2. Use `/gstack-qa-only` for UI verification
3. Use `/gstack-benchmark` for performance-sensitive UI changes
4. Use `/gstack-cso` for auth, storage, sharing, or public URL changes

## Browser tools

When a real browser check is required, prefer the repo-local gstack browser workflow over ad hoc browsing.

## Minimum local gate

Before claiming work is ready:

1. Run `npm run build`
2. Confirm the relevant Hades pass criteria
