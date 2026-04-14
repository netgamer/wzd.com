## Goal

Remove the decorative card dot in workspace boards and tighten the card header height.

## User-visible outcome

- Workspace cards no longer show the top-left decorative color dot.
- Workspace cards use a shorter header area before the main content begins.

## In scope

- `src/styles/main.css` workspace card header and dot styling

## Out of scope

- Share/home card chrome
- Image note overlay controls
- Card body typography or content structure

## Risks

- Tightening header padding too much could crowd drag controls or action buttons.

## Pass criteria

- `981px+`: workspace cards do not show the top-left decorative dot.
- `981px+`: workspace cards have visibly less empty space above their content.
- `980px and below`: mobile card controls remain usable.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
