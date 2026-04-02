## Goal

Replace the floating board cat with a desktop-pet style blue cat that walks in straight lines, pauses at card edges, and jumps across cards like the original desktop pet.

## User-visible outcome

- The personal workspace board shows a blue cat companion that behaves like a small desktop pet instead of floating in place.
- The cat walks flat along board surfaces, waits at card ends, and jumps to other card tops without wall-cling behavior.

## In scope

- `src/App.tsx`
- `src/components/BoardCatCompanion.tsx`
- `src/styles/main.css`
- Task record for this behavior work

## Out of scope

- Landing page or shared board pets
- Click interactions, sounds, or multiple pets
- Perfect one-to-one recreation of every original EXE animation state

## Risks

- Bad frame selection could make the cat look broken instead of playful
- DOM-measured board motion could jitter on resize or while notes reflow
- The pet could overlap card content if jump targets or landing ledges are wrong

## Pass criteria

- `981px+`: personal workspace board shows the blue cat walking in a straight line on available ledges, pausing briefly at card ends, and jumping to another card or the ground without covering core text content
- `980px and below`: the cat remains visible, scaled down, and does not break board layout
- Home landing and read-only/shared board views do not render the cat companion
- The cat uses extracted sprite frames from the original desktop-pet EXE, not a static cutout or emoji fallback
- `npm run build` passes
- `/gstack-review` finds no blocking issues
- `/gstack-qa-only` finds no blocking regressions on the touched board surface

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
- `/gstack-benchmark`

## Follow-up fixes

- 2026-04-02: tighten cling targeting so the cat anchors to a card's outer left/right wall instead of occasionally sticking to the card face interior
- 2026-04-02: remove wall-cling entirely and replace it with edge-wait plus jump-to-surface motion
- 2026-04-03: raise card surface anchoring so the cat walks on the top border line instead of sinking into note content
- 2026-04-03: lower the top-edge anchor slightly so the cat's feet sit on the card instead of hovering above it
- 2026-04-03: remap wait, leap, and drop poses to exact EXE frames for up-look idle, up-jump, down-look idle, and down-dive motion
- 2026-04-03: exclude topmost clipped cards from walkable surfaces so the cat never jumps to positions where its body is hidden
- 2026-04-03: correct the top-card idle pose to the seated upward-looking EXE frame requested by the user
- 2026-04-03: correct the drop pose to the crouched downward-looking EXE frame requested by the user
- 2026-04-03: align both wait poses to the exact user-picked EXE frames for top idle and pre-drop crouch
- 2026-04-03: export the original EXE frame tiles as numbered PNGs under `public/companions/original-frames` so future pose picks can use explicit numbers
- 2026-04-03: rebuild `public/companions/original-frames` from isolated `segments` instead of broken tile slices so every numbered frame is a valid single pose
- 2026-04-03: set the down-looking wait pose to `21.png` and split composite `01.png` into four additional numbered frames `67.png` to `70.png`
- 2026-04-03: set top wait to `67.png`, down wait to `21.png`, halve walking speed, and add occasional seated blink loops using `17.png` and `18.png`
- 2026-04-03: use `67.png` for waits before same-level or upward jumps, and only use `21.png` when the next jump target is actually below the current ledge
- 2026-04-03: split composite `11.png` into twelve additional numbered poses `71.png` to `82.png` and regenerate the frame index
- 2026-04-03: remap upward jump to `82.png` and downward fall to `78.png` per user-selected numbered frames
- 2026-04-03: remap walk cycle to `04 -> 05 -> 06 -> 72 -> 73 -> 13` and loop back to `04`
- 2026-04-03: delete legacy named jump/drop PNGs so the repo only retains the active numbered-frame mapping
- 2026-04-03: use `78.png` during downward target jumps inside the `leap` state so descending jumps no longer reuse the upward `82.png` frame
- 2026-04-03: update jump and drop facing from actual horizontal travel so left-to-right jumps flip the sprite correctly
