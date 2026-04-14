## Goal

Remove the heavy card-like top header shell and restyle board selection to feel closer to a Pinterest section header.

## User-visible outcome

- The workspace board picker no longer sits inside a large rounded header card.
- Board selection starts with a simple section title and underline.
- Board tabs feel lighter and more editorial than utility chrome.

## In scope

- `src/App.tsx` board-picker header markup
- `src/styles/main.css` board-picker header and tab styling

## Out of scope

- Mobile board sheet redesign
- Board content cards

## Pass criteria

- `981px+`: board picker header is no longer rendered as a large card shell.
- `981px+`: section title and underline appear above the board selector.
- `npm run build` passes.
