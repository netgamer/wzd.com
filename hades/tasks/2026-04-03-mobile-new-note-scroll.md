## Goal

Scroll the mobile workspace to the newly created note when the user adds a note from the mobile header action.

## User-visible outcome

- On mobile, tapping `+` creates a note and automatically moves the viewport to that new note card.

## In scope

- `src/App.tsx`

## Out of scope

- Desktop note creation scrolling
- Scroll behavior for selecting existing notes

## Risks

- Scrolling too early could land before the new note renders
- Reusing selected-note state could cause unwanted jumps when editing older notes

## Pass criteria

- `980px and below`: tapping the mobile new-note button scrolls the workspace to the newly created note after it renders
- `981px+`: desktop note creation behavior remains unchanged
- Selecting existing notes does not trigger the same automatic scroll
- `npm run build` passes
- `/gstack-review` finds no blocking issues
- `/gstack-qa-only` finds no blocking regressions on the touched mobile note-creation flow

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
