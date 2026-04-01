# Task

## Goal

Install repo-local gstack and establish the Hades planner-builder-verifier loop for this repository.

## User-visible outcome

- The repo has a repeatable verification workflow
- gstack verifier skills are available locally to Codex
- Hades role docs exist and can be followed on the next task

## In scope

- Resolve the current local merge conflict
- Install repo-local gstack for Codex
- Add Hades role/process docs
- Add a minimal local verification entrypoint in `package.json`
- Document the workflow in the repo

## Out of scope

- Running every gstack verifier skill on the current product
- Refactoring the app architecture
- Shipping new product features

## Risks

- Vendored skills increase repo size
- Future gstack upgrades may regenerate many files
- The app bundle is already large and still needs follow-up splitting

## Pass criteria

- Working tree has no unresolved merge markers
- `npm run build` passes
- Repo-local gstack exists at `.agents/skills/gstack`
- Generated verifier skills exist for Codex
- Hades docs exist in the repo root and `hades/`

## Required checks

- `npm run build`
