## Goal

Move auto-organize out of the workspace top header and surface it as a compact icon action beside the board status chips.

## User-visible outcome

- The workspace header no longer includes a large `자동 정리` pill.
- The board status row shows an icon-only auto-organize action before the save/pin/history/trash chips.

## In scope

- `src/App.tsx`
- `src/styles/main.css`

## Out of scope

- Changes to auto-organize logic or layout results
- Read-only/share/home page header changes

## Risks

- The new icon button could feel visually detached from the chip row
- Removing the topbar action could leave a duplicate control elsewhere on mobile

## Pass criteria

- `981px+`: workspace top header no longer shows `자동 정리`
- `981px+`: active editable board shows an icon-only auto-organize button at the start of the trust/status row
- `980px and below`: the same control remains accessible in the board status row without wrapping into a broken layout
- Read-only board views do not show the new auto-organize control
- `npm run build` passes
- `/gstack-review` finds no blocking issues
- `/gstack-qa-only` finds no blocking regressions on the touched board surface

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
