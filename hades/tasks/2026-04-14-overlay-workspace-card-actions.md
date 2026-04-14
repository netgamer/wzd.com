## Goal

Remove reserved header space from workspace cards by overlaying card actions at the top-right.

## User-visible outcome

- Workspace cards no longer keep empty space above the content for hidden controls.
- Hover controls float at the top-right instead of affecting content spacing.
- Top and bottom body padding stay visually balanced.

## In scope

- `src/styles/main.css` workspace card head/action/body layout

## Out of scope

- Share/home card layout
- Image note overlays
- Link-only card overlay behavior

## Risks

- Absolute-positioned controls could overlap small-card content if spacing is too tight.

## Pass criteria

- `981px+`: workspace cards do not reserve visible blank header space.
- `981px+`: workspace card actions appear at the top-right on hover.
- `981px+`: workspace card body top and bottom padding are visually balanced.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
