## Goal

Refresh RSS widgets every minute with a visible loading indicator and sequential 3D item flips when new posts arrive.

## User-visible outcome

- RSS widgets check for new posts every 60 seconds.
- While checking, a small rotating refresh indicator appears in the widget header.
- When feed items change, visible rows flip one-by-one with a 3D transition.

## In scope

- `src/App.tsx` RSS polling and staged display updates
- `src/styles/main.css` RSS flip animation and refresh indicator styles

## Out of scope

- Backend RSS parsing changes
- Non-RSS widget animation behavior

## Risks

- Too-frequent refreshes could cause noticeable motion if feeds are noisy.
- Sequential updates must not block interaction on the widget.

## Pass criteria

- RSS widgets refresh automatically every 60 seconds.
- A refresh indicator spins during polling.
- Changed RSS rows animate sequentially instead of swapping instantly.
- `npm run build` passes.

## Required checks

- `npm run build`
