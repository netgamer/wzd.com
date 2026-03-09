# WZD Portal Clone

## Run locally
1. Copy `.env.example` to `.env` and fill Supabase values.
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`

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

## Current milestone
- 3-column dashboard layout
- Drag and drop widgets across columns
- Column resize
- Add/delete/collapse widgets
- Memo editing with local persistence
- Google login button wired to Supabase Auth
- Agent widget chat execution via GCP agent server
- n8n workflow creation request from agent widget
