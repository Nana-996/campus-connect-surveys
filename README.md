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
bun run build          # produces a production build for the configured Nitro host
bun run preview        # preview the production build locally
```

To target a different host, set `NITRO_PRESET` before building:

```bash
NITRO_PRESET=node-server bun run build       # generic Node server
NITRO_PRESET=bun bun run build               # Bun server
NITRO_PRESET=cloudflare-module bun run build # Cloudflare Workers
```

See [Nitro presets](https://nitro.build/deploy) for the full list.

## Hosting

This repository does not depend on any hosted-platform integration. Pushes to GitHub are
validated by GitHub Actions. Choose a Nitro-compatible Node or edge host for
production deployment. GitHub Pages is not sufficient by itself because this
app uses server-side routes and Supabase server functions.

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
