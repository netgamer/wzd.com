# WZD Design Review

Date: 2026-04-01
Inputs:
- `hades/reviews/2026-04-01-office-hours.md`
- `hades/reviews/2026-04-01-ceo-review.md`
- `hades/reviews/2026-04-01-eng-review.md`

## Verdict

The product has a real visual identity hiding inside it. The current UI mixes too many modes in the same visual language.

That makes the app feel less intentional than it actually is.

## The core design mistake

The same system is trying to behave like:

- an editing workspace
- a public page
- a landing page
- a widget dashboard

Those should not look the same.

## Required mode split

### 1. Edit mode

Purpose:

- capture fast
- move cards around
- organize and recover

Design rules:

- controls are visible
- chrome is allowed
- density is moderate
- drag affordances are obvious
- save state and history are visible

### 2. Share mode

Purpose:

- read and browse
- trust the author
- understand the board fast

Design rules:

- remove editor chrome
- increase whitespace and section rhythm
- stronger typography hierarchy
- card groups should feel curated, not draggable
- hero and metadata should feel page-like

### 3. Home / landing mode

Purpose:

- explain the product
- seed templates or examples
- get the user into a board quickly

Design rules:

- marketing clarity first
- not a working board clone
- limited interactive noise

## Card system recommendations

The board should have a small number of first-class card styles.

Keep these as primary:

- note
- link
- image
- TODO
- RSS

These should each have clear visual rules, not one generic card shell with small exceptions.

Examples:

- link card: top accent bar, domain/meta, title hierarchy, optional image
- image card: image-first, minimal meta, strong crop rules
- note card: text-first, color identity, easy scanning
- TODO card: checklist-first, obvious completion state

## Current design issues

1. Public and private surfaces are visually too close.
2. Widget variety makes the board feel noisy before the core cards feel finished.
3. Mobile layouts still degrade into "compressed desktop" too often.
4. Some card types have stronger visual polish than others, so the board feels inconsistent.

## Mobile rules

Mobile should not be a narrower desktop.

Required rules:

- sidebar hidden behind explicit navigation only when in true mobile mode
- header actions reduced to essentials
- card width should snap to comfortable reading widths
- board should scroll vertically by default when in organized/mobile mode
- share page should read like a feed, not a canvas

## Visual direction

Keep the warm board identity. It gives WZD personality.

But make the surfaces more deliberate:

- edit board: warmer, tactile, active
- share page: cleaner, calmer, more editorial
- landing: strongest brand voice, less workspace noise

## Design scorecard

- product personality: 8/10
- mode clarity: 4/10
- card consistency: 6/10
- mobile readability: 5/10
- share-page quality: 5/10

## Design decision

Before another wave of widget expansion, define and enforce the three-mode design system:

1. Edit
2. Share
3. Home

Then audit each card type against that system.
