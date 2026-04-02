## Goal

Move board share and invite actions out of the workspace header and surface them inside board settings.

## User-visible outcome

- The workspace header no longer shows `보드 공유` and `보드 초대`.
- Board settings includes actions for sharing the board and managing invites.

## In scope

- `src/App.tsx`

## Out of scope

- Changes to share/invite backend behavior
- Read-only, public, or landing page actions

## Risks

- Removing header shortcuts could make collaboration actions harder to find if settings placement is weak
- Duplicate entry points could remain on mobile if not cleaned up together

## Pass criteria

- `981px+`: editable workspace header no longer shows `보드 공유` or `보드 초대`
- `981px+`: board settings menu shows share and invite actions when the user has permission
- `980px and below`: mobile board action sheet no longer duplicates direct share/invite actions outside settings
- Read-only board views do not show new settings actions
- `npm run build` passes
- `/gstack-review` finds no blocking issues
- `/gstack-qa-only` finds no blocking regressions on the touched board surface

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
