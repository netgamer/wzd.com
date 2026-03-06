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
