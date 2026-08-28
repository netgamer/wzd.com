# Search discovery

## Goal

Improve public WZD discovery by search engines and AI search without expanding Workers execution.

## User-visible outcome

- A readable static service introduction, linked from the app and sitemap.
- Search crawlers can discover public content without accessing private APIs.

## In scope

- Home metadata, static introduction, robots.txt, sitemap, regression checks.

## Out of scope

- Ranking guarantees, news.wzd.kr deployment, private board publication, AI training consent, DNS or WAF changes.

## Risks

- Cloudflare managed robots rules can override origin policy; Google-Extended is currently blocked.
- SPA fallback metadata is shared by other app routes; avoid publishing private data or adding new dynamic handlers.

## Pass criteria

- Static introduction contains actual product information and a self canonical.
- Public search agents allowed, API crawling discouraged, training blocks not loosened.
- Existing /api/* and /board/* Workers scope unchanged.
- Build and SEO regression checks pass; live deployment verified.

## Required checks

- npm run build
- Code review against gstack-review checklist (manual fallback: Bash/Bun unavailable).

## Extra checks if applicable

- Browser check of app and static introduction.
- Diff-scoped public-content security review; no database, auth, dependencies, or Worker changes.
- No performance-sensitive runtime changes or new dependencies.

## Verification

- PASS: npm run build; existing >500 kB app bundle warning remains.
- PASS: node scripts/verify-seo.mjs; canonical, JSON-LD, sitemap, crawler groups and Worker route regression assertions.
- PASS: git diff --check.
- PASS: browser at 390x844 and 1280x800; readable introduction, landing-page link navigates to /about, start link returns to app.
- Manual review fallback: no auth, database, user-supplied HTML, dependencies or Worker routing changed. Static content only; no personal board data included. This AI-assisted diff review is not a substitute for a professional security audit.
- External limitation: Cloudflare managed robots currently blocks Google-Extended; Gemini training/grounding permission needs owner decision. Search Console/Bing submissions not performed.
- Deployment verification pending after push.
