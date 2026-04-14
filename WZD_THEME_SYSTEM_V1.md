# WZD Theme System v1

## 1. Theme Philosophy
Themes change tone, not structure. Every WZD theme uses the same layout, spacing, card rules, and navigation system.

Each theme should only adjust:
- background tone
- surface tone
- text contrast tuning
- accent color
- border/shadow intensity

Never change:
- component hierarchy
- layout structure
- card anatomy
- navigation placement

---

## 2. Theme Set

### 1) Cream
Base warm default theme.
- mood: soft, warm, welcoming
- app background: warm off-white
- surface: ivory / milk white
- accent: muted indigo or deep navy
- use: default everyday theme

### 2) Mist
Cool, calm productivity theme.
- mood: clean, quiet, modern
- app background: pale gray-blue
- surface: cloud white
- accent: slate blue
- use: focused work mode

### 3) Forest
Natural and grounded theme.
- mood: stable, calm, organic
- app background: soft sage mist
- surface: warm light neutral
- accent: olive / forest green
- use: reading, journaling, slow planning

### 4) Lavender
Gentle creative theme.
- mood: thoughtful, soft, slightly expressive
- app background: pale lavender haze
- surface: warm white with lilac tint
- accent: muted violet
- use: personal inspiration boards

### 5) Charcoal
Dark mode theme.
- mood: cinematic, focused, premium
- app background: charcoal / graphite
- surface: dark slate
- accent: cool silver-blue or soft violet
- use: night browsing / immersive mood

### 6) Peach
Warm lifestyle theme.
- mood: friendly, light, everyday
- app background: pale peach sand
- surface: creamy neutral
- accent: terracotta-peach or warm coral
- use: life dashboard / casual collections

---

## 3. Shared Theme Rules
1. Accent colors must stay controlled.
2. Background and card contrast must preserve readability.
3. Widgets should not get unique rainbow colors by default.
4. Status colors remain consistent across themes.
5. The feed must remain calm and scannable in every theme.

---

## 4. Theme Token Categories
Each theme should define:
- `bg-app`
- `bg-surface`
- `bg-surface-elevated`
- `border-soft`
- `text-primary`
- `text-secondary`
- `brand-primary`
- `brand-soft`
- `accent-soft`
- `shadow-color`

---

## 5. Theme Usage Guidance
- Use Cream as the baseline reference when designing new components.
- Test all new cards first in Cream and Charcoal.
- If a card works only in one theme, the component is too fragile.
- Decorative backgrounds must stay subtle enough to avoid fighting feed content.

---

## 6. Theme Anti-Patterns
Do not:
- create theme-specific layouts
- use strong candy colors on every surface
- mix multiple saturated accents in one screen
- change border radius per theme
- change navigation UI per theme

---

## 7. Rollout Guidance
Implementation order:
1. Cream baseline
2. Charcoal validation
3. Mist / Forest / Lavender / Peach extension

This ensures structure is stable before theme variety expands.
