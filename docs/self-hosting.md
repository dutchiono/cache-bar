# Self-Hosting

This repo can run against a self-hosted Convex backend instead of Convex Cloud.

## Local Convex stack

Start the backend and dashboard:

```bash
bun run selfhost:up
```

The local defaults are:

- Convex API: `http://127.0.0.1:3210`
- Convex HTTP actions: `http://127.0.0.1:3211`
- Convex dashboard: `http://localhost:6791`

Generate an admin key:

```bash
bun run selfhost:key
```

Create a local `.env.local` in the repo root:

```bash
VITE_CONVEX_URL=http://127.0.0.1:3210
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=<generated admin key>
CONVEX_SITE_URL=http://127.0.0.1:3211
SITE_URL=http://127.0.0.1:5173
APP_URL=http://127.0.0.1:5173
```

Push functions and keep them synced while developing:

```bash
bunx convex dev --env-file .env.local
```

Seed the local storefront catalog:

```bash
bunx convex run bootstrap:ensureStorefront --env-file .env.local
```

Run the frontend against the self-hosted backend:

```bash
bun run dev:selfhost
```

Stop the local Convex stack:

```bash
bun run selfhost:down
```

## Production shape

For a server deployment, route public domains to the three Convex services:

- `https://api.example.com` -> backend port `3210`
- `https://convex.example.com` -> HTTP actions port `3211`
- `https://convex-dashboard.example.com` -> dashboard port `6791`

Then set:

```bash
VITE_CONVEX_URL=https://api.example.com
CONVEX_SELF_HOSTED_URL=https://api.example.com
CONVEX_SITE_URL=https://convex.example.com
SITE_URL=https://cache.example.com
APP_URL=https://cache.example.com
```

Keep `CONVEX_SELF_HOSTED_ADMIN_KEY` secret. Do not commit generated keys or deployment-specific `.env.local` files.
