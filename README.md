# .cache

.cache is the commerce concierge for waifu and creator-led drops.

## Main surfaces

- `/` — public storefront
- `/checkout` — buyer identity and Stripe handoff
- `/stash` — token burn redemption for one-time Stripe discount codes
- `/app` — staff ops
- `/app/agent` — .cache concierge status and ops chat

## Stack

- Vite + React + TypeScript
- Convex for backend, auth, and data
- Stripe Checkout for payments
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
