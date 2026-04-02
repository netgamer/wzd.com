## Goal

Merge the landing memo samples and real widget previews into one unified board section that shows memo cards and realistic widget cards together.

## User-visible outcome

- The `ALL WIDGETS AT A GLANCE` section presents a dense mixed board with memo samples and realistic widget previews in one place.
- The separate memo-only and real-widget-only sections are no longer needed below it.

## In scope

- `src/features/landing/LandingPage.tsx`
- `src/styles/main.css`
- The landing section currently titled `ALL WIDGETS AT A GLANCE`
- Removal of the redundant `MEMO CONTENT EXAMPLES` and `REAL WIDGET PREVIEW` sections

## Out of scope

- Hero section copy and layout
- Authenticated workspace UI
- Widget behavior or data fetching

## Risks

- A merged board could become visually noisy if memo cards and widget cards do not share a consistent rhythm
- Removing two sections could accidentally drop useful copy or reduce scan clarity on mobile

## Pass criteria

- `981px+`: the main landing board section shows memo sample cards and realistic widget cards together in a dense masonry-style layout
- `981px+`: at least 3 memo samples and the existing realistic widget types remain visible in the merged board
- `980px and below`: the merged board collapses cleanly without clipped cards or overlapping content
- The standalone memo-only section is removed
- The standalone real-widget-only section is removed
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
