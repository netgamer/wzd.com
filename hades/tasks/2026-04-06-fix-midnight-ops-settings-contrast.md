## Goal

Restore readable contrast inside the settings panel when the board uses the Midnight Ops theme.

## User-visible outcome

- `981px+`: Midnight Ops settings text, rows, and action buttons are readable.
- `980px and below`: Midnight Ops mobile settings sheet remains readable.

## In scope

- `src/styles/main.css`

## Out of scope

- Changing non-settings board card colors
- Changing settings content or behavior

## Risks

- Darkening the settings panel must not regress Focus Desk or other light themes.

## Pass criteria

- `981px+`: board owner, editor count, home board, and settings buttons are readable in Midnight Ops.
- `980px and below`: same settings sections remain readable in Midnight Ops.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
