# WZD Office Hours

Date: 2026-04-01
Mode: Startup mode

## What WZD is

WZD should be a visual personal board for people who collect links, images, notes, and small widgets all day, then want that mess to turn into a page they can actually use and share.

Short version:

- capture fast
- organize automatically
- publish cleanly

That is the whole game.

## 1. Who is desperate for this

The first real user is not "anyone who takes notes". That bucket is too wide and too soft.

The real first user is someone who is already collecting material in a sloppy way across browser tabs, screenshots, chat apps, bookmarks, and Notion pages, and hates the maintenance overhead.

Best first wedges:

- solo creators collecting research and references
- students building subject boards from scattered links and screenshots
- planners who want a public share page without building a whole site
- people using Notion as a dumping ground, not as a structured wiki

## 2. What they do today

Today they use a bad stack:

- browser bookmarks for quick saves
- screenshots for visual memory
- chat-to-self for temporary capture
- Notion for storage, later, maybe
- docs or notes apps for cleaned-up output

This is bad because the capture flow and the presentation flow are separate. The user collects in one place, cleans in another, and shares in a third.

## 3. What hurts enough to matter

The pain is not "I need another note app".

The pain is:

- I want to drop things somewhere now, not organize a database
- I want it to look decent without spending 30 minutes arranging blocks
- I want to share a board or page without it feeling like my internal messy workspace
- I want mobile capture to feel native, not like fighting a desktop UI on a narrow screen

## 4. Narrowest wedge

The narrowest strong wedge is not the general widget dashboard.

The wedge is:

**A board where pasting a link, image, or note instantly creates a useful visual card, auto-organizes it, and can be published as a clean share page.**

If WZD does this well, the user gets an instant outcome in under a minute.

## 5. What is special about this team/product now

The repo already has the right raw ingredients:

- board model with persistence in `src/lib/supabase-board-v2.ts`
- public board routing in `functions/board/[slug].js`
- link preview pipeline in `functions/api/link-preview.js` and `src/lib/link-preview.ts`
- widget system in `src/components/WidgetBody.tsx`
- landing and sharing behaviors already starting to exist in `src/App.tsx`

The mistake is not capability. The mistake is focus.

## 6. Why now / what changes if this works

If this works, the user stops thinking of WZD as a memo toy or dashboard toy.

They think:

- this is where I dump things
- this is where they get cleaned up
- this is the page I can send people

That is much stronger than "it has a lot of widgets".

## 7. Recommended product sentence

Use this everywhere internally:

**WZD is a visual personal board that lets you paste links, images, and notes fast, auto-organizes them into usable cards, and turns the board into a clean shareable page.**

## 8. What to stop doing

Do not lead with generic dashboard expansion.

Deprioritize these as primary roadmap drivers:

- weather
- delivery tracking
- trending keyword
- food recommendation
- visitor pet
- any new widget whose value is unrelated to capture, organize, or publish

Those can stay, but they are not the product story.

## 9. What to build next

The next product loop should tighten the core wedge:

1. make board capture absurdly fast
2. make auto-organize reliable and legible
3. make share mode feel like a polished public page
4. make board history and restore trustworthy

## 10. Verdict

WZD is worth building.

But only if it chooses one identity. Right now the repo is drifting between cork board, note app, widget dashboard, and personal homepage builder.

Pick one.

The strongest one is capture -> organize -> publish.
