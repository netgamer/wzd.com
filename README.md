# WZD Portal Clone

## Run locally
1. Copy `.env.example` to `.env` and fill Supabase values.
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`

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
5. Add env vars in Pages:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_ENV`
   - `VITE_AGENT_API_BASE_URL`

## Agent server (GCP VM) + GitHub deploy
1. Clone this repo on VM to `/opt/wzd-app`.
2. Install runtime on VM:
   - Node.js 20+
   - `pm2` (`npm i -g pm2`)
3. Create `server/.env` on VM and fill:
   - `PORT`
   - `ALLOWED_ORIGIN`
   - `GROQ_API_KEY`
   - `GROQ_MODEL`
   - `N8N_BASE_URL`
   - `N8N_API_KEY`
4. Start once on VM:
   - `cd /opt/wzd-app && npm ci && pm2 start ecosystem.config.cjs --only wzd-agent`
5. Add GitHub secrets (Repository > Settings > Secrets and variables > Actions):
   - `GCP_VM_HOST`
   - `GCP_VM_USER`
   - `GCP_VM_SSH_KEY`
6. Push to `main` -> `.github/workflows/deploy-agent-server.yml` runs and auto deploys.

## Supabase setup
1. Create a Supabase project.
2. Enable Google provider in Auth.
3. Set Authorized redirect URL:
   - `https://<your-pages-domain>`
   - `http://localhost:5173`
4. Run SQL from `supabase/schema.sql` in SQL editor.
   - Includes: `dashboard_layouts`, `widgets`, `agent_runs`, `agent_steps`, `user_workflows`
5. For cork-board redesign, run `supabase/schema.board-v2.sql` in SQL editor.
   - Includes: `boards`, `notes`, `note_tags` with RLS policies.

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
