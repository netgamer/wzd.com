## Goal

Align the desktop left sidebar with the Pinterest-style icon rail instead of the previous board-list sidebar.

## User-visible outcome

- The left sidebar becomes a narrow icon rail similar to Pinterest.
- Board switching stays in the topbar rather than inside the left rail.
- The left rail exposes primary app destinations and quick actions.

## In scope

- `src/App.tsx` left rail structure and route handlers
- `src/styles/main.css` icon rail styling

## Out of scope

- Mobile bottom navigation redesign
- New backend endpoints
- Notification or message data sources

## Risks

- If board switching remains duplicated in the left rail, the UI will feel inconsistent.
- If icon actions are unclear, users may lose discoverability without tooltips and active states.

## Pass criteria

- `981px+`: the left sidebar renders as a narrow Pinterest-like icon rail.
- `981px+`: board switching remains accessible from the top bar.
- `981px+`: rail actions navigate or open the expected workspace surfaces.
- `npm run build` passes.

## Required checks

- `npm run build`
