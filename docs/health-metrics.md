# WZD.KR Codebase Health Metrics

## 2026-05-05

| Metric | Value | vs Yesterday |
|---|---|---|
| Date | 2026-05-05 | — |
| Build Status | ✅ SUCCESS | ✅ SUCCESS |
| Build Time (total) | 8.6s (tsc + vite) | +0.5s |
| Build Time (vite only) | 1.69s | +0.06s |
| App.tsx Lines | 11,800 | ↔ no change |
| main.css Size | 216,939 bytes (212 KB) | ↔ no change |
| Commits Today | 3 | ↔ same |

### Bundle Sizes

| File | Raw | Gzip | vs Yesterday |
|---|---|---|---|
| index.html | 2.73 kB | 1.02 kB | +0.78 kB (hreflang tags added) |
| vendor.js | 10.28 kB | 3.55 kB | ↔ |
| react-vendor.js | 137.64 kB | 44.02 kB | ↔ |
| supabase-vendor.js | 168.04 kB | 44.43 kB | ↔ |
| index.js (main) | 490.52 kB | 114.87 kB | ↔ |
| **Total JS** | **806.48 kB** | **206.87 kB** | ↔ |

### Today's Commits (2026-05-05)
All 3 commits are SEO-only — low risk, no source logic touched.

| Hash | Message | Risk |
|---|---|---|
| 260a2dc | seo(auto): add hreflang link tags and update sitemap lastmod | 🟢 Low |
| 5706ae5 | seo(auto): fix meta tags, add sitemap and robots.txt | 🟢 Low |
| fea529e | seo(auto): add JSON-LD WebApplication schema and keywords meta | 🟢 Low |

### Warnings
- ⚠️ `npm audit` found 4 vulnerabilities (3 moderate, 1 high) — run `npm audit fix` (unchanged from yesterday)
- ✅ All JS chunks under 600 KB threshold
- ✅ index.js (main) at 490.52 kB — 82% of 600 KB limit, watch for growth

---

## 2026-05-04

| Metric | Value |
|---|---|
| Date | 2026-05-04 |
| Build Status | ✅ SUCCESS |
| Build Time (total) | 8.1s (tsc + vite) |
| Build Time (vite only) | 1.63s |
| App.tsx Lines | 11,800 |
| main.css Size | 216,939 bytes (212 KB) |
| Commits Today | 3 |

### Bundle Sizes

| File | Raw | Gzip |
|---|---|---|
| index.html | 1.95 kB | 0.77 kB |
| vendor.js | 10.28 kB | 3.55 kB |
| react-vendor.js | 137.64 kB | 44.02 kB |
| supabase-vendor.js | 168.04 kB | 44.43 kB |
| index.js (main) | 490.52 kB | 114.87 kB |
| **Total JS** | **806.48 kB** | **206.87 kB** |

### Warnings
- ⚠️ `npm audit` found 4 vulnerabilities (3 moderate, 1 high) — run `npm audit fix`
- ✅ All chunks under 600 KB threshold

---
*First recorded baseline — future runs will compare against this.*
