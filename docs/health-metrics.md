# WZD.KR Codebase Health Metrics

## 2026-05-07

| Metric | Value | vs Yesterday |
|---|---|---|
| Date | 2026-05-07 | — |
| Build Status | ✅ SUCCESS | ✅ SUCCESS |
| Build Time (total) | 11.53s (tsc + vite) | +2.58s |
| Build Time (vite only) | 2.03s | +0.28s |
| App.tsx Lines | 11,800 | ↔ no change |
| main.css Size | 216,939 bytes (212 KB) | ↔ no change |
| Commits Today | 3 | -1 |

### Bundle Sizes

| File | Raw | Gzip | vs Yesterday |
|---|---|---|---|
| index.html | 3.24 kB | 1.21 kB | +0.10 kB (JSON-LD og:image property) |
| vendor.js | 10.28 kB | 3.55 kB | ↔ |
| react-vendor.js | 137.64 kB | 44.02 kB | ↔ |
| supabase-vendor.js | 168.04 kB | 44.43 kB | ↔ |
| index.js (main) | 490.52 kB | 114.87 kB | ↔ |
| **Total JS** | **806.48 kB** | **206.87 kB** | ↔ |

### Today's Commits (2026-05-07)
All 3 commits are SEO/report — low risk, no source logic touched.

| Hash | Message | Risk |
|---|---|---|
| 63bbeed | seo(auto): update sitemap lastmod to 2026-05-07 | 🟢 Low |
| 97ab0da | seo(auto): add og:image:type and image property to JSON-LD schema | 🟢 Low |
| ec7d50d | report(auto): daily health metrics 2026-05-06 | 🟢 Low |

### Warnings
- ⚠️ `npm audit` found 4 vulnerabilities (3 moderate, 1 high) — run `npm audit fix` (unchanged)
- ⚠️ Build time spike: 11.53s vs 8.95s yesterday (+28.8%) — likely npm install overhead, vite-only time normal (+0.28s)
- ✅ All JS chunks under 600 KB threshold
- ✅ index.js (main) at 490.52 kB — 82% of 600 KB limit, watch for growth

---

## 2026-05-06

| Metric | Value | vs Yesterday |
|---|---|---|
| Date | 2026-05-06 | — |
| Build Status | ✅ SUCCESS | ✅ SUCCESS |
| Build Time (total) | 8.95s (tsc + vite) | +0.35s |
| Build Time (vite only) | 1.75s | +0.06s |
| App.tsx Lines | 11,800 | ↔ no change |
| main.css Size | 216,939 bytes (212 KB) | ↔ no change |
| Commits Today | 4 | +1 |

### Bundle Sizes

| File | Raw | Gzip | vs Yesterday |
|---|---|---|---|
| index.html | 3.14 kB | 1.20 kB | +0.41 kB (SEO overhaul — noscript, meta, robots) |
| vendor.js | 10.28 kB | 3.55 kB | ↔ |
| react-vendor.js | 137.64 kB | 44.02 kB | ↔ |
| supabase-vendor.js | 168.04 kB | 44.43 kB | ↔ |
| index.js (main) | 490.52 kB | 114.87 kB | ↔ |
| **Total JS** | **806.48 kB** | **206.87 kB** | ↔ |

### Today's Commits (2026-05-06)
All 4 commits are SEO/report — low risk, no source logic touched.

| Hash | Message | Risk |
|---|---|---|
| 3322181 | seo(auto): update sitemap lastmod to 2026-05-06 | 🟢 Low |
| 04fd8cf | seo(auto): add noscript fallback and disallow duplicate /landing route | 🟢 Low |
| 474632a | seo(auto): full SEO overhaul — meta tags, og:image, sitemap, robots | 🟢 Low |
| f8c37ed | report(auto): daily health metrics 2026-05-05 | 🟢 Low |

### Warnings
- ⚠️ `npm audit` found 4 vulnerabilities (3 moderate, 1 high) — run `npm audit fix` (unchanged)
- ⚠️ Build environment: node_modules absent at run time — required `npm install` before build
- ✅ All JS chunks under 600 KB threshold
- ✅ index.js (main) at 490.52 kB — 82% of 600 KB limit, watch for growth

---

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
