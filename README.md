# .cache

.cache is the commerce concierge for waifu and creator-led drops.

## Main surfaces

- `/` — public storefront
- `/checkout` — buyer identity and Stripe handoff
- `/stash` — token burn redemption for one-time Stripe discount codes
- `/launchpad` — interactive agent-foundry architecture demo
- `/app` — staff ops
- `/app/agent` — .cache concierge status and ops chat

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
Sticker proof NFT notes live in [docs/sticker-drop-nft.md](docs/sticker-drop-nft.md).
Solana DTOUR sticker flow notes live in [docs/solana-sticker-drop.md](docs/solana-sticker-drop.md).
The agent launchpad architecture and build sequence live in [docs/agent-foundry-blueprint.md](docs/agent-foundry-blueprint.md).
Partner-agent promo notes live in [docs/partner-agent-promo-playbook.md](docs/partner-agent-promo-playbook.md).
The local partner-agent skill lives in [skills/partner-agent-shop/SKILL.md](skills/partner-agent-shop/SKILL.md).
