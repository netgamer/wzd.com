## Goal

Ensure the cat faces right when jumping to the right.

## User-visible outcome

- Rightward jump uses the mirrored leap pose.
- Walking, waiting, and dropping keep their existing direction behavior.

## In scope

- `src/styles/main.css`

## Out of scope

- Changing cat movement logic
- Changing frame choices

## Pass criteria

- Rightward leap visually faces right.
- `npm run build` passes.

## Required checks

- `npm run build`
