# .cache

.cache is the storefront and ops shell for the current POD-backed sticker run.

## Main surfaces

- `/` — public storefront
- `/checkout` — POD sticker request, no card collection
- `/stash` — paused for the current sticker run
- `/app` — staff ops
- `/app/agent` — .cache concierge status and ops chat

## Stack

- Vite + React + TypeScript
- Convex for backend, auth, and data
- Static `.cache` storefront shell for the live sticker front end
- POD provider setup for three sticker SKUs at 50 units each
- `.stash` token-linked discounts are paused until sticker pricing is final
- Eliza-ready concierge channel for web, Discord, Telegram, and waifu agents

## Local commands

```bash
bun install
bunx convex dev
bun run build
bun run lint
```

For local self-hosted Convex, use:

```bash
bun run selfhost:up
bun run selfhost:key
bunx convex dev --env-file .env.local
bunx convex run bootstrap:ensureStorefront --env-file .env.local
bun run dev:selfhost
```

## Handoff

The current POD sticker run lives in [docs/pod-sticker-run.md](docs/pod-sticker-run.md).
Stripe and `.stash` notes are legacy until pricing is decided: [docs/stripe-handoff.md](docs/stripe-handoff.md).
Eliza and waifu handoff notes live in [docs/eliza-waifu-handoff.md](docs/eliza-waifu-handoff.md).
The Eliza Cloud proxy, migration, and contingency plan lives in [docs/cache-eliza-cloud-plan.md](docs/cache-eliza-cloud-plan.md).
Convex component wiring is tracked in [docs/convex-components.md](docs/convex-components.md).
POD provider mode notes live in [docs/teemill-integration-plan.md](docs/teemill-integration-plan.md).
Self-hosting notes live in [docs/self-hosting.md](docs/self-hosting.md).
