# WZD CEO Review

Date: 2026-04-01
Input: `hades/reviews/2026-04-01-office-hours.md`
Mode: Scope reduction with selective expansion

## Verdict

The product is promising. The current scope is sloppy.

WZD should not try to be a universal personal dashboard right now. That path makes the product feel busy without making it indispensable.

## 10-star version

The 10-star version of WZD is:

- you paste anything into a board in seconds
- it becomes a good-looking card automatically
- the board stays readable without manual layout pain
- one click turns it into a page worth sharing
- the mobile flow feels first-class, not tolerated

That product has a clear emotional payoff. It feels like magic because the mess becomes a page.

## What the product should optimize for

Optimize for these four feelings:

1. instant capture
2. visual clarity
3. trust that nothing gets lost
4. pride when sharing

If a feature does not improve one of those, it should not be in the critical path.

## What to cut from the P0 narrative

Cut these from the headline roadmap:

- weather widget
- trending widget
- delivery widget
- food recommendation widget
- visitor pet widget
- any widget that makes the board feel like a portal instead of a board

These features are not evil. They are just not the wedge.

## What to keep in the wedge

Keep and strengthen:

- note cards
- link cards
- image cards
- TODO cards
- RSS cards, only if they are clearly treated as collected references
- board duplication
- board history and restore
- share page presentation
- mobile capture and mobile reading

## Product hierarchy

There are really three products hiding in one app. They need hierarchy.

1. Edit Board
- private workspace
- fast capture
- sorting, dragging, auto-organize, history

2. Share Page
- public or semi-public presentation surface
- cleaner typography, cleaner spacing, less editor chrome

3. Landing/Home
- product entry and template seed, not a mixed editing surface

Right now these modes bleed into each other.

## Strategic call

WZD should be sold internally as a personal board-to-page tool.

Not a dashboard. Not a Notion clone. Not a widget kitchen sink.

## Next 3 bets

### Bet 1. Share mode quality

Make shared boards feel like something a user would actually send to another person.

This means:

- stronger hero/header treatment
- cleaner section rhythm
- card spacing that reads like a page, not a working canvas
- minimal edit chrome in public mode

### Bet 2. Trust and recovery

Users will dump important things into this app. If restore, history, and trash are weak, they will not trust it.

This means:

- visible history snapshots
- easy restore UI
- stronger trash recovery flow
- clearer autosave state

### Bet 3. Capture speed

The core interaction should feel immediate.

This means:

- paste-first workflows
- quick add on desktop and mobile
- better card defaults for links and screenshots
- less modal friction

## Concrete P0 for the next month

1. separate edit mode from share mode visually and structurally
2. refactor `src/App.tsx` so the product can keep moving
3. improve board history/trash/autosave trust cues
4. tighten card rendering quality for note, link, image, and TODO

## Revenue direction

Do not monetize novelty widgets first.

Monetize the stuff a serious user already values:

- advanced history and restore
- premium share themes
- larger upload/storage limits
- premium templates
- collaboration permissions and audit trail

## CEO scorecard

- market clarity: 7/10
- product focus: 4/10
- user pain alignment: 8/10
- wedge sharpness: 5/10
- roadmap discipline: 4/10

## CEO decision

Proceed.

But stop expanding sideways. Make the core loop excellent first.
