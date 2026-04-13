# Task Template

## Goal

Make the landing page explain WZD as a personalized bookmark + RSS first page by turning the static hero preview into a concrete preset-based first-page story.

## User-visible outcome

- Visitors can switch between a few realistic first-page presets and immediately see how bookmarks, RSS, and quick cards change for a specific daily routine.
- The landing hero explains why each preset exists and what someone opens first, without redesigning the rest of the landing or board app.

## In scope

- `src/features/landing/LandingPage.tsx`
- `src/styles/main.css`
- Landing hero copy, preset controls, and preset-specific first-page preview content

## Out of scope

- Board editor behavior
- Share page redesign
- New widgets, market work, or agent-related product work
- App-wide navigation or layout changes outside the landing surface

## Risks

- The hero can become busier instead of clearer if the preset UI is too heavy.
- Small-screen layout can regress if the preset controls or summary area do not collapse cleanly.

## Pass criteria

- `769px+`: landing hero shows a preset picker and a corresponding personalized first-page preview without overflow or collapsed controls.
- `521px-768px`: preset picker wraps cleanly and the personalized preview remains readable in a single-column hero layout.
- `520px and below`: preset controls stack cleanly, summary text stays readable, and the hero preview remains tappable and visually stable.
- The personalized copy stays focused on bookmark + RSS + first-page positioning, not generic dashboard language.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-cso`
