# WZD Portal Clone

## What is WZD?
WZD is the personalized first page you want to see when you open your browser.

The current core is simple: organize your most important bookmarks, pull in the RSS feeds you actually read, and shape that screen into a page that feels like your own. Instead of a generic browser start page or a rigid link-in-bio list, WZD is for people who live in the browser, keep too many tabs open, and want one useful first screen that is both practical and personal.

WZD can also grow into a shareable personal page. Someone deep in AI can make a first page that combines GeekNews, favorite tools, YouTube channels, and working links. Someone focused on acting can collect OTR, Filmmakers, Modelnara, audition links, and references into one board. The product is not just "save links." It is "make your own first page and your own information surface."

## Product direction
- Personalized first page for browser-heavy users who want more than a default new tab.
- Bookmark + RSS core experience for people who want their most important links and reading sources in one place.
- Shareable personal page as a natural extension, not the starting point.
- Multi-device sync, widget expansion, and desktop/mobile surfaces as later extensions.

## Run locally
1. Copy `.env.example` to `.env` (optional — only sets the agent server URL).
2. Copy `.dev.vars.example` to `.dev.vars` and fill `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH_REDIRECT_URL`.
3. Install dependencies: `npm install`
4. Bootstrap the D1 database (first run only):
   - `npx wrangler d1 create wzd` and paste the returned `database_id` into `wrangler.toml`
   - `npm run db:migrate:local`
5. Vite-only client preview (no API): `npm run dev`
6. Full-stack preview (Pages Functions + D1): `npm run build && npm run dev:pages` → http://localhost:8788

## Hades + gstack workflow
1. Read `HADES.md`.
2. For product-facing work, read the latest planning reviews in `hades/reviews/`.
   - `2026-04-01-office-hours.md`
   - `2026-04-01-ceo-review.md`
   - `2026-04-01-eng-review.md`
   - `2026-04-01-design-review.md`
3. Create a task file from `hades/task-template.md`.
4. Implement the change.
5. Run local gate: `npm run hades:verify-local`
6. Run repo-local gstack verifier skills in Codex:
   - `/gstack-review`
   - `/gstack-qa-only` for UI work
   - `/gstack-benchmark` for performance-sensitive UI work
   - `/gstack-cso` for auth, storage, sharing, or public URL changes

## Repo-local gstack
1. gstack source is vendored at `.agents/skills/gstack`
2. Generated Codex skills are available under `.agents/skills/gstack-*`

## Cloudflare Pages deploy
1. Push repository to GitHub.
2. In Cloudflare Pages, connect the Git repository.
3. Build command: `npm run build`
4. Build output directory: `dist`
5. Bind D1 database `wzd` to the project (Settings → Functions → D1 bindings, `DB`).
6. Add Pages secrets (`wrangler pages secret put …` or dashboard):
   - `JWT_SECRET` — random 32-byte base64 string
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `OAUTH_REDIRECT_URL` — `https://<your-pages-domain>/api/auth/callback`
7. Build-time env vars (Variables tab):
   - `VITE_APP_ENV`
   - `VITE_AGENT_API_BASE_URL`
8. Apply migrations once: `npm run db:migrate:prod`.

## Insight Reader MVP assets
- Static sample page: `public/wzd_kr_insight_sample.html`
- Supabase schema/function seed: `supabase/insight-reader-mvp.sql`
- The SQL file includes the `get_home_payload` RPC, trending/hero/feed views, bookmark support, and seed data for the insight-style first-page MVP.

## Agent server (GCP VM) + GitHub deploy
1. Clone this repo on VM to `/opt/wzd-app`.
2. Install runtime on VM:
   - Node.js 20+
   - `pm2` (`npm i -g pm2`)
3. Create `server/.env` on VM and fill:
   - `PORT`
   - `ALLOWED_ORIGIN`
   - `GROQ_API_KEY`
   - `GROQ_MODEL` (`openai/gpt-oss-120b` recommended)
   - `N8N_BASE_URL`
   - `N8N_API_KEY`
4. Start once on VM:
   - `cd /opt/wzd-app && npm ci && pm2 start ecosystem.config.cjs --only wzd-agent`
5. Add GitHub secrets (Repository > Settings > Secrets and variables > Actions):
   - `GCP_VM_HOST`
   - `GCP_VM_USER`
   - `GCP_VM_SSH_KEY`
6. Push to `main` -> `.github/workflows/deploy-agent-server.yml` runs and auto deploys.

## D1 setup
1. `npx wrangler d1 create wzd` — copy `database_id` into `wrangler.toml`.
2. Apply migrations:
   - Local: `npm run db:migrate:local`
   - Production: `npm run db:migrate:prod`
3. Migrations live in `migrations/`:
   - `0001_init.sql` — users, dashboard_layouts, widgets, agent_runs, agent_steps, user_workflows
   - `0002_board_v2.sql` — boards, notes, note_tags, user_profiles, board_members
   - `0003_insight_reader.sql` — sources, items, tags, clusters, action_suggestions, bookmarks
   - `0004_media.sql` — media (R2 object index for ownership / cleanup)

## R2 setup (image attachments)
1. `npx wrangler r2 bucket create wzd-media`
2. Bind it in production: Pages → Settings → Functions → R2 bindings, `R2_MEDIA = wzd-media`.
3. Uploads go to `POST /api/upload` (auth required, 5 MB cap, image/* only).
4. Serving goes through `GET /api/media/<key>` — never expose the bucket's
   public URL directly, so ownership + Cache-Control can be enforced.

## Google OAuth
1. In Google Cloud Console, reuse the existing OAuth 2.0 client.
2. Add authorized redirect URIs:
   - `https://<your-pages-domain>/api/auth/callback`
   - `http://localhost:8788/api/auth/callback`
3. Copy the client ID/secret to Pages secrets (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) and to `.dev.vars` for local runs.

## Current milestone
- 3-column dashboard layout
- Drag and drop widgets across columns
- Column resize
- Add/delete/collapse widgets
- Memo editing with local persistence
- Google login button wired to Supabase Auth
- Agent widget chat execution via GCP agent server
- n8n workflow creation request from agent widget
- Agent run/step history persistence to Supabase (with RLS)

## Sync note
- WSL OpenClaw commit/push path verified.
