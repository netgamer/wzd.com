# Task: Extract page shells from App.tsx

## Goal

Split the current monolithic `src/App.tsx` into separate page shells for board edit mode, share mode, and home mode without changing visible behavior.

## User-visible outcome

- No intended visual change in this task.
- Fewer layout regressions when editing header, sidebar, share page, or landing board behavior later.

## In scope

- Create `src/features/board/BoardPage.tsx`
- Create `src/features/share/SharePage.tsx`
- Create `src/features/home/HomePage.tsx`
- Move top-level conditional rendering out of `src/App.tsx`
- Keep current data flow and props stable

## Out of scope

- New UI design
- Card redesign
- State store rewrite
- Widget logic rewrite

## Risks

- Hidden cross-mode dependencies inside `src/App.tsx`
- Breakage in mobile and share routing conditions
- Prop drilling explosion if extraction is too shallow

## Pass criteria

- `src/App.tsx` no longer directly renders all three page modes inline
- Existing home, edit, and share entry paths still render correctly
- `npm run build` passes
- Diff does not change intended behavior

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
- `/gstack-cso`
