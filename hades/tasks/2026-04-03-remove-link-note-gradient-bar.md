## Goal
Remove the decorative gradient bar from link-only note cards.

## User-visible outcome
- Link-only notes no longer show the top gradient bar.

## In scope
- src/styles/main.css link-only note visual styling.

## Out of scope
- Changes to link preview content or other note card styles.
- Changes to image or widget card top accents.

## Risks
- The gradient bar may be shared by multiple card variants if the selector is too broad.
- Removing the pseudo-element can affect card spacing if tied to layout.

## Pass criteria
- 981px+: link-only note cards render without the top gradient bar.
- 980px and below: mobile link-only note cards render without the top gradient bar.
- Other card types keep their existing top accent styling.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.
- `/gstack-qa-only` verifies the link-only card accent is gone.

## Required checks
- `npm run build`
- `/gstack-review`

## Extra checks if applicable
- `/gstack-qa-only`
