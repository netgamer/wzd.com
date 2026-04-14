# WZD Design System v1

## 1. Product Design Thesis
WZD is a personalized first page. The interface should feel more like a calm, content-first Pinterest board than an admin dashboard.

### Core principles
1. **Content first** — cards and saved items should appear before control-heavy UI.
2. **One visual language** — boards, widgets, actions, and content must feel related.
3. **Clean before expressive** — remove noise before adding flair.
4. **Soft structure** — use calm surfaces, light hierarchy, and restrained accents.
5. **Themes change tone, not structure** — layout stays consistent across themes.

---

## 2. Information Architecture

### Desktop
- **Left rail**: primary navigation only
- **Top row**: board selection only
- **Main stage**: Pinterest-style content grid
- **Search**: removed from the main top surface

### Mobile
- **Top row**: board selection only
- **Main stage**: content feed immediately visible
- **Bottom navigation**: primary mobile navigation
- Remove large hero/control panels from the top area

---

## 3. Layout Tokens

### Spacing scale
Use only these values:
- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48

### Radius scale
- `radius-sm`: 12
- `radius-md`: 16
- `radius-lg`: 20
- `radius-xl`: 24
- `radius-pill`: 999

### Shadow scale
- `shadow-soft`: subtle card lift only
- `shadow-mid`: elevated panels / floating nav
- `shadow-none`: default for flat feed surfaces when possible

Rule: prefer soft borders and soft shadows. Avoid heavy, muddy elevation.

---

## 4. Color System

### Neutral tokens
- `bg-app`
- `bg-surface`
- `bg-surface-elevated`
- `border-soft`
- `text-primary`
- `text-secondary`
- `text-muted`

### Brand tokens
- `brand-primary`
- `brand-soft`
- `brand-contrast`
- `accent-soft`

### State tokens
- `state-success`
- `state-warning`
- `state-error`
- `state-info`

### Color rules
1. Most cards should use neutral surfaces.
2. Accent colors should highlight selection, focus, or one primary action.
3. Do not assign strong unique colors to every widget.
4. State colors must be reserved for actual state, not decoration.

---

## 5. Typography

### Type roles
- `display`
- `heading`
- `title`
- `body`
- `caption`
- `label`

### Usage rules
- Board names use `title` or `heading`, never oversized display text.
- Card titles use `title`.
- Metadata and source labels use `caption`.
- Button and tab text use `label`.
- Keep line-height generous and avoid cramped stacks.

---

## 6. Card System

### A. Content Card
Used for:
- bookmarks
- RSS items
- reading cards
- saved pages
- gallery/media items

Structure:
- optional media/thumbnail
- title
- source/meta
- optional summary
- optional quick action

### B. Utility Card
Used for:
- add widget
- add board
- setup prompts
- configuration entry cards

Rule:
Utility cards should still feel like part of the feed, not an admin control block.

### C. Info/Status Card
Used for:
- empty states
- sync info
- gentle notices
- success/warning/error summaries

Rule:
Status cards should be calm, compact, and secondary to content.

### Universal card rules
- consistent radius by card size tier
- consistent internal padding
- restrained shadows
- soft border option
- no random gradients unless theme explicitly allows a subtle one
- widgets must obey the same card DNA

---

## 7. Widget Styling Rules
Widgets should feel like clean Pinterest cards, not control dashboards.

### Widget rules
1. Same radius/padding rhythm as content cards
2. Minimal chrome
3. Calm metadata
4. Action controls reduced or tucked away
5. Widget-specific decoration should be subtle

### Anti-patterns
- giant utility boxes at the top
- over-colored widgets
- mixed border styles
- wildly different card heights without purpose

---

## 8. Navigation Rules

### Desktop navigation
- left rail = home, boards, updates, settings/profile level navigation
- top = board selection only
- no heavy top toolbar

### Mobile navigation
- top = board selection only
- bottom nav = home, boards/search/add/activity/profile (final set can be refined)
- avoid placing major action clusters in the top area

---

## 9. Buttons and Actions

### Button roles
- `primary`
- `secondary`
- `ghost`
- `icon-only`

### Rules
- only one strong primary action per area
- icon-only actions must share one shape system
- secondary actions should not visually fight content cards
- destructive/error tones only for real destructive actions

---

## 10. Feed Behavior
- Feed is the main product surface
- Users should see real content early
- Empty states must still feel like part of the feed
- Board switching should never visually hide the content stage

---

## 11. Design Guardrails
1. If a change makes content appear later, it is likely wrong.
2. If a widget looks more like a settings panel than a feed card, it is likely wrong.
3. If different surfaces feel like different apps, it is wrong.
4. If a theme requires layout changes, the system is too loose.
5. If mobile top area becomes taller than necessary, simplify again.
