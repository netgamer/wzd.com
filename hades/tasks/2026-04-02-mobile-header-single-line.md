## Goal

Keep the landing page header on a single row on mobile instead of stacking into multiple rows.

## User-visible outcome

- On mobile, the landing header shows the logo, one-line descriptor, and login button in a single compact row.

## In scope

- `src/styles/main.css`
- Mobile-only landing header layout

## Out of scope

- Desktop landing header
- Hero content and card layout
- Authenticated app header

## Risks

- The descriptor text could collide with the login button on narrow screens
- Over-compressing the header could hurt readability or tap size

## Pass criteria

- `768px and below`: landing header remains a single row
- `768px and below`: descriptor text stays on one line and does not overlap the button
- `768px and below`: login button remains tappable and visible
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
