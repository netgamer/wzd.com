## Goal

Make the landing page RSS sample card resemble the real in-product RSS widget instead of a generic memo-like sample.

## User-visible outcome

- The RSS card in the upper landing widget gallery looks like a feed widget with a source label and stacked article items.

## In scope

- `src/features/landing/LandingPage.tsx`
- `src/styles/main.css`
- The RSS card inside the upper `ALL WIDGETS AT A GLANCE` section

## Out of scope

- Other widget sample cards
- The lower real widget preview section
- Authenticated workspace widgets

## Risks

- The RSS sample could visually drift from the real app widget if the layout is over-stylized
- CSS changes could unintentionally affect non-RSS landing cards

## Pass criteria

- `981px+`: the RSS card in the upper landing widget gallery shows a source line and at least 3 stacked article items with timestamps
- `980px and below`: the RSS card remains readable without overlapping or clipped content
- Non-RSS cards in the upper landing widget gallery keep their current layout
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
