# Task

## Goal

Make the TODO widget use a true editable list view in edit mode, with a dedicated add-row button.

## User-visible outcome

- TODO widget edit mode shows rows, not a textarea
- Each row has a real checkbox and editable text field
- New rows are added only through a `+` action
- Row deletion is explicit and predictable

## In scope

- TODO widget edit-mode rendering in [App.tsx](C:\Users\junho\Documents\code\wzd.com\src\App.tsx)
- TODO widget edit-mode styles in [main.css](C:\Users\junho\Documents\code\wzd.com\src\styles\main.css)
- Persistence of row text and checked state

## Out of scope

- New widget types
- Board layout changes
- TODO sharing/collaboration semantics

## Risks

- Edit-mode controls may interfere with card click selection
- Empty rows may serialize badly if normalization is too aggressive
- Mobile spacing may break if row controls are too wide

## Pass criteria

- Edit mode contains no textarea-based checklist editor
- `+ 할 일 추가` adds one new editable row
- Toggling a checkbox updates saved state
- Editing row text updates saved state
- Deleting a row removes only that row
- View mode still renders as read-friendly TODO rows
- `npm run build` passes
- `/gstack-review` finds no blocking issue
- `/gstack-qa-only` finds no blocking UI issue

## Required checks

- `npm run build`
- `/gstack-review`
- `/gstack-qa-only`
