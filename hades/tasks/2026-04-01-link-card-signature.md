# Task: Make link cards the signature surface

## Goal

Turn WZD link cards into the strongest, most recognizable card type in the product.

## User-visible outcome

- Link cards feel more premium and more branded.
- Cards with and without images still look intentional.
- The board feels more valuable because the most common card type looks finished.

## In scope

- `link-preview-card` visual rules
- accent strip
- site/meta/title/description/url hierarchy
- image and no-image variants
- action chrome polish for link cards

## Out of scope

- Full widget redesign
- Board architecture refactor
- Share page redesign

## Risks

- Over-design can reduce scan speed.
- Instagram-specific handling can regress if generic link styles override it.

## Pass criteria

- Link cards look materially more polished than before.
- Image and no-image link cards share one family look.
- `npm run build` passes.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`
