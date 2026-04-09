## Goal

Add a board-native AI widget that calls the existing Groq-backed agent server and renders the response inside the current note system.

## User-visible outcome

- Users can add an `AI 브레인` widget from the widget gallery.
- The widget lets users choose an agent role, enter a goal and context, and run the AI directly from the board.
- The latest AI response is shown inside the card and persists as note metadata.

## In scope

- `src/App.tsx` widget type, gallery item, add-widget action, and render logic
- `src/lib/agent.ts` API client for `/api/agent/chat`
- `src/styles/main.css` AI widget styling

## Out of scope

- Secret storage in the frontend
- Multi-turn chat history
- Scheduling UI for n8n workflows

## Risks

- If the agent API base URL is missing or unreachable, the widget must fail gracefully without breaking the board.
- Persisting long responses in note metadata could make cards visually noisy if the layout is not constrained.

## Notes

- Frontend AI calls require `VITE_AGENT_API_BASE_URL` in the web app environment. `server/.env` alone is not enough because browser bundles cannot read server-only env files.

## Pass criteria

- `981px+`: `AI 브레인` appears in the widget gallery and can be added to a board.
- `981px+`: running the widget sends the configured role, prompt, and context to the existing agent server.
- `981px+`: success and failure states are shown clearly inside the card.
- `980px and below`: the widget remains readable without layout overflow.
- `npm run build` passes.
- `/gstack-review` finds no blocking issues.

## Required checks

- `npm run build`
- `/gstack-review`

## Extra checks if applicable

- `/gstack-qa-only`
