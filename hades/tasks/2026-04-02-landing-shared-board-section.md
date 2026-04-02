## Goal

Add a new landing section that shows a realistic shared board example for companies or groups.

## User-visible outcome

- The landing page includes a dedicated shared board section after the personal board examples.
- The new section looks like a collaborative board used by a team, company, or meetup group.

## In scope

- `src/features/landing/LandingPage.tsx`
- `src/styles/main.css`
- New shared board sample section on the landing page

## Out of scope

- Authenticated shared board behavior
- Landing hero and personal board section behavior
- Backend or persistence changes

## Risks

- The new section could feel redundant if it does not clearly differentiate from the personal board section
- Too many cards could make the landing page feel overly long on mobile

## Pass criteria

- `981px+`: a new shared board section appears below the personal board section
- `981px+`: the shared board content reads as team/company/group collaboration rather than personal use
- `980px and below`: the shared board section remains readable without clipping or overlap
- `npm run build` passes

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
