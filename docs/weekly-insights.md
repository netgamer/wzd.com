# WZD.KR Weekly Insights — 2026-05-04

## Summary

**Period:** 2026-04-28 ~ 2026-05-04
**Total Commits:** 25

---

## Activity by Category

| Category | Count | Description |
|---|---|---|
| `style` | 9 | UI redesign, layout, visual polish |
| `fix` | 7 | Bug fixes (images, CSS, loading) |
| `feat(ui)` | 3 | New UI features |
| `seo(auto)` | 3 | Automated SEO improvements |
| `fix(auto)` | 3 | Automated bug fixes |

---

## Notable Changes This Week

### New Features
- **Pinterest-style topbar** — pill tabs + search bar (`feat(ui): Pinterest 스타일 탑바`)
- **오늘의 트렌드 위젯** — Trend widget with Pinterest-style redesign
- **종합 UI 개선** — Loading states, icons, labels, tab system, flags

### Bug Fixes
- Fixed broken image display with `onError` fallbacks across multiple img tags
- Eliminated loading skeleton flicker on page refresh
- Fixed mobile bottom nav and pin-input missing CSS
- Fixed floating button overlap on mobile

### Style Overhaul
- Pinterest-style card grid with hover improvements
- Widget badge system redesigned as post-it index tabs
- Weather emoji scaled up significantly (5x main, 2x forecast)
- Loading skeleton redesigned in Pinterest style
- Restaurant widget unified into single view
- Widget card double-white-background removed

### SEO (Automated)
- Added favicon, robots meta, theme-color to index.html
- Added og-image, og:locale, og:image meta tags, aria-labels
- Added sitemap and robots.txt

---

## Patterns & Observations

1. **High velocity, UI-heavy week** — 25 commits in 7 days, predominantly style/fix work.
2. **Pinterest design system adoption** — Consistent pivot toward card-based, grid layout across widgets.
3. **Automated SEO pipeline active** — 3 auto-commits for SEO improvements show automation is working.
4. **Large App.tsx** — At 11,800 lines, the single-file component is becoming a maintainability risk.
5. **Main bundle near limit** — index.js at 490 KB (82% of 600 KB threshold); growth trend to watch.

---

## Recommendations

1. **Split App.tsx** — Extract widget components into separate files to reduce complexity and improve tree-shaking. Target: <3,000 lines per file.
2. **Address security vulnerabilities** — Run `npm audit fix` to resolve 4 known vulnerabilities (1 high).
3. **Bundle splitting** — Consider lazy-loading heavy widgets (YouTube player, Supabase-dependent views) to keep main chunk under 400 KB.
4. **Image error handling** — Multiple `onError` fixes this week suggest a systematic broken-image problem; audit image sources upstream.
5. **CSS size** — 212 KB of CSS with no apparent purging; consider adding PurgeCSS or reviewing unused rules.

---

*Generated automatically on 2026-05-04 (Monday)*
