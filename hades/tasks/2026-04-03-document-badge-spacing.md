## Goal
Add clearer spacing between the DOC badge and the document section content.

## User-visible outcome
- Document section cards show more breathing room between the top DOC badge and the document body card.

## In scope
- src/styles/main.css spacing for document note widget header/body.

## Out of scope
- Changes to other widget spacing.
- Changes to document content structure or CTA behavior.

## Risks
- A broad widget-header change could affect non-document widgets.
- Too much spacing could make compact cards feel loose.

## Pass criteria
- 981px+: document section cards have visible spacing between the DOC badge and the content block.
- 980px and below: mobile document section cards keep the same improved spacing without layout breakage.
- Other widget cards keep their current spacing.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies the document badge spacing looks correct.

## Required checks
- `npm run build`
- `/gstack-review`

## Extra checks if applicable
- `/gstack-qa-only`
