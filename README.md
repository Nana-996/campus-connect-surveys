# CampusVerify

Credit-powered survey platform connecting researchers with verified university students.

Built with **TanStack Start** (React 19, Vite 7, file-based routing, SSR via Nitro) and **Supabase** (auth, Postgres with RLS, storage).

## Local development

```bash
bun install            # or: npm install / pnpm install
cp .env.example .env   # then fill in real values
bun run dev            # http://localhost:8080
```

## Build

```bash
bun run build          # produces a Vercel-ready build by default
bun run preview        # preview the production build locally
```

To target a different host, set `NITRO_PRESET` before building:

```bash
NITRO_PRESET=node-server bun run build       # generic Node server
NITRO_PRESET=bun bun run build               # Bun server
NITRO_PRESET=cloudflare-module bun run build # Cloudflare Workers
```

See [Nitro presets](https://nitro.build/deploy) for the full list.

## Deploying to Vercel

1. Push the repo to GitHub / GitLab / Bitbucket.
2. Import the project on Vercel — **Framework Preset: Other** (already configured in `vercel.json`).
3. Add the environment variables from `.env.example` in **Project Settings → Environment Variables**:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `VITE_SITE_URL` (your deployed origin, e.g. `https://campusverify.app`)
4. Deploy. The build emits `.vercel/output/` (Vercel Build Output API v3) and routes are served by the Nitro Vercel adapter.

## Database

SQL migrations live in `supabase/migrations/`. Apply them with the Supabase CLI:

```bash
supabase link --project-ref <your-ref>
supabase db push
```

## Project layout

```
src/
  routes/            # file-based routes (TanStack Router)
  components/        # shared UI (shadcn/ui + custom)
  lib/               # business logic, server functions (.functions.ts)
  integrations/      # Supabase clients (browser, server, admin)
supabase/
  migrations/        # SQL migrations
public/              # static assets, PWA icons, manifest
```
