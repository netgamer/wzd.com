## Goal

Allow trending keywords to expand inline and show related articles as clickable destinations.

## User-visible outcome

- Clicking a trending keyword expands related news links below it.
- Related headlines open the original article destination.
- The keyword row itself no longer redirects immediately.

## In scope

- `src/App.tsx` trending widget expand/collapse state and rendering
- `src/styles/main.css` expanded trending news list styles

## Out of scope

- Backend trending parsing changes
- RSS widget behavior

## Risks

- Expanded rows increase card height and may shift masonry layout during interaction.

## Pass criteria

- Keyword rows toggle expanded related links.
- Clicking a related headline opens its source URL.
- `npm run build` passes.

## Required checks

- `npm run build`
