# Platform Build Handoff

This is the operational handoff for the combined `.cache` + Foundry build as it exists today in
production. Use it as the first stop before you drill into the narrower subsystem docs.

## What is live now

- `.cache` storefront: `https://cachebar.bushleague.xyz/`
- Foundry launch surface: `https://foundry.bushleague.xyz/`
- Production Convex backend: `https://impartial-herring-497.convex.site`
- Durable Foundry launch demo:
  - `GET /foundry/v1/network`
  - `POST /foundry/v1/demo/launch`
  - `GET /foundry/v1/demo/launch?id=...`
- `.cache` proposal-only capability API:
  - `GET /capabilities/cachebar/v1/health`
  - `GET /capabilities/cachebar/v1/catalog`
  - `POST /capabilities/cachebar/v1/proposals`
  - `GET /capabilities/cachebar/v1/proposals?id=...`
- Trading Machine adapter boundary:
  - watch, simulate, and propose only
  - no public execution route
- Current fee routing model:
  - `10%` compute reserve
  - `10%` cold-start reserve
  - `10%` protocol ops
  - `70%` launch owner

## What is still simulated or intentionally incomplete

- Foundry public launches are durable simulations, not real onchain launches.
- No production Base market adapter exists yet.
- No onchain launch-to-runtime provisioning path exists yet.
- The public Foundry network feed is not contract-indexed yet.
- Trading Machine execution remains disabled on purpose.
- Verse is visible in the registry but stays operator-gated.

## Production topology

### Public surfaces

- `.cache` static site is served from `cachebar.bushleague.xyz`.
- Foundry static site is served from `foundry.bushleague.xyz`.
- Both surfaces depend on the same production Convex deployment for backend state and HTTP actions.

### Deploy flow

- GitHub Actions workflow: `.github/workflows/deploy.yml`
- `main` push flow:
  - `bun install --frozen-lockfile`
  - `bun run check:platform`
  - `bunx convex deploy`
  - optional prod env sync into Convex
  - storefront seed + migrations
  - `bun run build`
  - `bun run build:foundry`
  - upload `dist/*` to `.cache`
  - upload `dist-foundry/*` to Foundry

### Static deploy identities

- `.cache` deploy uses:
  - `DEPLOY_HOST`
  - `DEPLOY_USER`
  - `DEPLOY_PATH`
  - `DEPLOY_SSH_KEY`
- Foundry deploy uses its own dedicated identity:
  - `FOUNDRY_DEPLOY_USER`
  - `FOUNDRY_DEPLOY_PATH`
  - `FOUNDRY_DEPLOY_SSH_KEY`

### Key env and secret surfaces

- Required to build and deploy:
  - `VITE_CONVEX_URL`
  - `CONVEX_DEPLOY_KEY`
- Foundry static-site API override:
  - `VITE_FOUNDRY_API_URL`
  - optional; current code falls back to `https://impartial-herring-497.convex.site`
- `.cache` capability auth:
  - `CACHEBAR_CAPABILITY_API_TOKENS`
- `.cache` commerce integrations:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `APP_URL`
  - `TEEMILL_PROJECT_NAME`
  - `TEEMILL_PRIVATE_API_KEY`
  - `TEEMILL_PUBLIC_SAFE_KEY`
- Eliza / channel / messaging surfaces:
  - `CACHE_ELIZA_BASE_URL`
  - `CACHE_ELIZA_API_KEY`
  - `CACHE_ELIZA_AGENT_ID`
  - `CACHE_ELIZA_CHANNEL_ID`
  - `CACHE_ELIZA_MODE`
  - `DISCORD_APPLICATION_ID`
  - `DISCORD_API_TOKEN`
  - `TELEGRAM_BOT_TOKEN`
  - `RESEND_API_KEY`
  - `RESEND_WEBHOOK_SECRET`
  - `RESEND_TEST_MODE`
  - `CACHE_EMAIL_FROM`

## Verification checklist

### Public URLs

- `.cache`: `https://cachebar.bushleague.xyz/`
- Foundry: `https://foundry.bushleague.xyz/`
- Foundry network feed:
  - `https://impartial-herring-497.convex.site/foundry/v1/network`
- Foundry launch demo endpoint:
  - `https://impartial-herring-497.convex.site/foundry/v1/demo/launch`
- `.cache` capability health:
  - `https://impartial-herring-497.convex.site/capabilities/cachebar/v1/health`

### Expected API behavior

- `GET /foundry/v1/network`
  - `200`
  - returns durable demo launches followed by `.cache`, Trading Machine, and Miono fixtures
- `OPTIONS /foundry/v1/demo/launch`
  - `204`
  - returns Foundry CORS headers
- `POST /foundry/v1/demo/launch`
  - `202`
  - returns launch record + ordered audit events
- `GET /foundry/v1/demo/launch?id=...`
  - `200` for a valid launch id
- `GET /capabilities/cachebar/v1/health`
  - `200`
  - authority remains `proposal-only`
- `GET /capabilities/cachebar/v1/catalog` without auth
  - `401`

### Repo validation commands

```bash
bun run check:platform
bun run lint
bun run build
bun run build:foundry
git diff --check
```

## Where to read next

- Architecture and build sequence:
  - `docs/agent-foundry-blueprint.md`
- Foundry demo HTTP contract:
  - `docs/foundry-demo-control-plane.md`
- `.cache` operator and commerce docs:
  - `docs/stripe-handoff.md`
  - `docs/eliza-waifu-handoff.md`
  - `docs/teemill-integration-plan.md`
  - `docs/solana-sticker-drop.md`
  - `docs/sticker-drop-nft.md`
  - `docs/partner-agent-promo-playbook.md`

## Next engineering slices

1. Replace the Foundry simulated feed with contract-indexed public launch status.
2. Implement the Base market adapter and real child-market provisioning path.
3. Connect real runtime provisioning to launch records instead of demo-only replay.
4. Harden capability auth, operator review, and wallet policy around launch installs.
5. Keep Trading Machine in watch/propose mode until execution budget controls, tenant isolation,
   and audit requirements are finished.
