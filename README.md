# .cache

.cache is the commerce concierge for waifu and creator-led drops.

## Main surfaces

Public demo is A / B only. **B is primary:**

- `/` and `/cache.html` — **live shop** · agentic merch (sticker pilot SKUs today)
- `/drop-001-live.html` — **reference demo only** · fake apparel catalog, not linked from live nav
- `/pod-request.html` — request flow for the live shop
- `/app` — staff ops
- `/app/pod-setup` — Prodigi setup

Surface map lives in [docs/storefront-surfaces.md](docs/storefront-surfaces.md).

## Stack

- Vite + React + TypeScript
- Convex for backend, auth, and data
- Stripe Checkout for payments
- Teemill hybrid support for custom-product checkout links and catalog-backed fulfillment
- `.stash` for token-linked discount redemption
- Eliza-ready concierge channel for web, Discord, Telegram, and waifu agents

## Local commands

```bash
bun install
bunx convex dev
bun run build
bun run lint
```

## Handoff

Stripe and `.stash` handoff notes live in [docs/stripe-handoff.md](docs/stripe-handoff.md).
Eliza and waifu handoff notes live in [docs/eliza-waifu-handoff.md](docs/eliza-waifu-handoff.md).
The Eliza Cloud proxy, migration, and contingency plan lives in [docs/cache-eliza-cloud-plan.md](docs/cache-eliza-cloud-plan.md).
Convex component wiring is tracked in [docs/convex-components.md](docs/convex-components.md).
Teemill hybrid mode notes live in [docs/teemill-integration-plan.md](docs/teemill-integration-plan.md).
Prodigi sticker POD notes live in [docs/prodigi-integration-plan.md](docs/prodigi-integration-plan.md).
Sticker proof NFT notes live in [docs/sticker-drop-nft.md](docs/sticker-drop-nft.md).
Solana DTOUR sticker flow notes live in [docs/solana-sticker-drop.md](docs/solana-sticker-drop.md).
The agent launchpad architecture and build sequence live in [docs/agent-foundry-blueprint.md](docs/agent-foundry-blueprint.md).
The separate Foundry launch-network demo deploys to [foundry.bushleague.xyz](https://foundry.bushleague.xyz).
Its durable simulated-launch HTTP boundary lives in [docs/foundry-demo-control-plane.md](docs/foundry-demo-control-plane.md).
The combined `.cache` + Foundry operator handoff lives in [docs/platform-build-handoff.md](docs/platform-build-handoff.md).
Partner-agent promo notes live in [docs/partner-agent-promo-playbook.md](docs/partner-agent-promo-playbook.md).
The local partner-agent skill lives in [skills/partner-agent-shop/SKILL.md](skills/partner-agent-shop/SKILL.md).
The local Prodigi fulfillment skill lives in [skills/prodigi-fulfillment/SKILL.md](skills/prodigi-fulfillment/SKILL.md).

## Agent capability API

The first `.cache` capability adapter is exposed from the Convex site URL:

- `GET /capabilities/cachebar/v1/health`
- `GET /capabilities/cachebar/v1/catalog`
- `POST /capabilities/cachebar/v1/proposals`
- `GET /capabilities/cachebar/v1/proposals?id=...`

Catalog and proposal routes require `X-Cache-Agent-Id`, `Authorization: Bearer ...`, and, for
proposal creation, `Idempotency-Key`. Configure the per-agent credentials as a JSON object in the
Convex `CACHEBAR_CAPABILITY_API_TOKENS` environment variable and the matching GitHub Actions secret.
