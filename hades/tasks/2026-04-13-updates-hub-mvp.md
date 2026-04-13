# Task Template

## Goal

Add a small SEO-friendly updates hub MVP for WZD using static in-repo content, without turning WZD into a CMS or making updates the main product.

## User-visible outcome

- Visitors can open an `/updates` index and browse a small set of detailed WZD product updates.
- Visitors can open dedicated detail pages at `/updates/:slug` with readable post content and clear metadata.
- The updates surface supports WZD positioning as a personalized first page product instead of distracting from it.

## In scope

- `src/App.tsx` route wiring for `/updates` and `/updates/:slug`
- A static in-repo updates content source with at least 3 detailed posts
- `src/features/updates/*` new page modules for updates index and detail rendering
- `src/styles/main.css` styles for the updates surface, reusing existing tokens and patterns where practical
- A minimal updates entry point from the existing public product surface if it can be added without changing core positioning

## Out of scope

- Any CMS, admin UI, markdown parser, or remote publishing flow
- Board editor, market, share, or insight feature redesign
- Large landing-page copy rewrite
- New backend, database, or auth behavior
- Making updates the homepage or primary navigation destination

## Risks

- The updates area can accidentally read like a blog-first product if the copy or placement is too dominant.
- Detail pages can become hard to scan on mobile if typography and spacing are not kept restrained.
- Manual route handling can miss slug edge cases if the pathname parsing is too loose.

## Pass criteria

- `981px+`: `/updates` renders a clean index with a heading, intro, and post cards; `/updates/:slug` renders a readable article layout without workspace chrome or overflow.
- `681px-980px`: updates index and detail pages collapse cleanly into a single-column reading layout with stable spacing.
- `680px and below`: post cards and article content remain readable and tappable with no clipped text or horizontal scroll.
- The updates content is static and repo-backed, with at least 3 detailed posts covering WZD repositioning, landing changes, and the insight reader MVP.
- The updates copy presents product-supporting context rather than shifting WZD into a publishing product.
- A minimal entry point to updates exists from the current public product surface without overpowering the main CTA flow.
- Unknown update slugs show a useful not-found state instead of crashing.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies the new public updates pages read correctly.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
