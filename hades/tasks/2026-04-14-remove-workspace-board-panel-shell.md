## Goal

Remove the rounded outer board panel shell from the desktop workspace so the note feed reads like a direct Pinterest-style canvas.

## User-visible outcome

- Desktop workspace boards no longer render inside the large rounded board container.
- The memo feed starts directly under the board tabs without an extra framed shell.
- Mobile workspace and public/share board shells keep their current structure.

## In scope

- `src/App.tsx` workspace board panel class selection
- `src/styles/main.css` desktop workspace board panel layout

## Out of scope

- Masonry card styling
- Public/share page container styling
- Mobile workspace board sheet redesign

## Risks

- Board-level overlays or companions may rely on the panel wrapper positioning.
- Removing the shell could expose spacing regressions between the board tabs and feed.

## Pass criteria

- `981px+`: workspace board view does not render the rounded `current-board-panel` shell.
- `981px+`: board content aligns directly on the page canvas, closer to a Pinterest feed.
- `980px and below`: workspace board view keeps the existing contained panel behavior.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
