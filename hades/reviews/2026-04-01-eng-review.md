# WZD Engineering Review

Date: 2026-04-01
Inputs:
- `hades/reviews/2026-04-01-office-hours.md`
- `hades/reviews/2026-04-01-ceo-review.md`

## Verdict

The product can move, but the current implementation shape will keep slowing it down.

The main issue is `src/App.tsx`. It is 7241 lines and about 304 KB. That file is acting as page shell, board controller, widget registry, modal orchestration, persistence coordinator, and public page renderer.

That is not one component. That is a small app trapped in one file.

## What this breaks in practice

- UI regressions are hard to localize
- state changes become scary because edit, share, mobile, and widget behaviors are coupled
- verifier work becomes expensive because every change touches the same surface
- future tests will be brittle unless state and rendering are separated first

## Current architecture shape

Frontend:

- `src/App.tsx`, all major flows mixed together
- `src/components/AddWidgetModal.tsx`
- `src/components/WidgetBody.tsx`
- `src/lib/supabase-board-v2.ts`
- `src/lib/link-preview.ts`
- `src/lib/rss.ts`, `weather.ts`, `trending.ts`, `delivery.ts`

Edge/server:

- `functions/api/*.js` for previews and feed/widget data
- `functions/board/[slug].js` for public board route
- `server/index.js` for agent-related backend and service endpoints

This is enough to ship features. It is not enough to scale feature work safely.

## Required refactor boundary

### Phase 1. Extract page shells

Create these top-level containers:

- `src/features/board/BoardPage.tsx`
- `src/features/share/SharePage.tsx`
- `src/features/home/HomePage.tsx`

Goal:

- stop rendering all major product modes from one file
- give each mode its own layout and top-level state boundary

### Phase 2. Extract board composition

Split board editing into:

- `src/features/board/components/BoardHeader.tsx`
- `src/features/board/components/BoardSidebar.tsx`
- `src/features/board/components/BoardCanvas.tsx`
- `src/features/board/components/BoardTabs.tsx`
- `src/features/board/components/BoardDialogs.tsx`

Goal:

- isolate layout concerns from card rendering and persistence logic

### Phase 3. Extract note/widget card system

Create:

- `src/features/cards/CardRenderer.tsx`
- `src/features/cards/NoteCard.tsx`
- `src/features/cards/LinkCard.tsx`
- `src/features/cards/ImageCard.tsx`
- `src/features/cards/TodoCard.tsx`
- `src/features/cards/RssCard.tsx`

Goal:

- stop encoding every card branch inline in `App.tsx`
- make UI review and QA per card type possible

### Phase 4. Extract board state and actions

Create:

- `src/features/board/state/useBoardState.ts`
- `src/features/board/state/boardSelectors.ts`
- `src/features/board/state/boardActions.ts`

Goal:

- separate derivation logic from rendering
- reduce prop chains and inline mutation helpers

### Phase 5. Extract share-specific rendering

Create:

- `src/features/share/components/ShareHero.tsx`
- `src/features/share/components/ShareSection.tsx`
- `src/features/share/components/ShareCardGrid.tsx`

Goal:

- share page should stop reusing edit-board assumptions

## Data and state recommendations

1. Keep Supabase persistence in `src/lib/supabase-board-v2.ts`, but wrap it with feature-level hooks.
2. Put board mode derivation in a single place. Right now mobile, compact, share, and editor decisions are too likely to diverge.
3. Move widget catalog metadata out of `App.tsx` into a static registry file.
4. Add one normalized card model interface in `src/types.ts` for note/link/image/widget variants.

## Testing requirements before more feature growth

The repo currently has a build gate, but not a real functional gate.

Minimum next test layer:

- smoke test: board load
- smoke test: create note
- smoke test: create link card from pasted URL
- smoke test: TODO add/check/delete item
- smoke test: trash restore
- smoke test: public share page render
- responsive checks at `375`, `768`, `1024`, `1440`

If Playwright is not added immediately, document the scenarios and run them through `gstack-qa-only` each cycle.

## Performance notes

Bundle splitting in `vite.config.ts` helped, but it does not solve runtime complexity.

The runtime risk is still large because:

- `App.tsx` loads too many behaviors in one render tree
- feature-level memoization and selective rendering are harder in the current shape
- mobile layout bugs keep coming back because condition trees are mixed together

## Engineering scorecard

- codebase shape: 4/10
- refactor readiness: 7/10
- feature velocity risk: high
- regression risk: high
- deployment complexity: medium

## Engineering decision

Do not add another major widget family before Phase 1 and Phase 2 extraction happen.

Next implementation task should be: extract `BoardPage`, `SharePage`, and `HomePage` out of `src/App.tsx` without changing visible behavior.
