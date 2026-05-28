# .cache

.cache is a storefront and ops system for creator-led drops.

## Main surfaces

- `/` — public storefront
- `/checkout` — buyer identity and Stripe handoff
- `/stash` — token burn redemption for one-time Stripe discount codes
- `/app` — staff ops

## Stack

- Vite + React + TypeScript
- Convex for backend, auth, and data
- Stripe Checkout for payments
- `.stash` for token-linked discount redemption

## Local commands

```bash
bun install
bunx convex dev
bun run build
bun run lint
```

## Handoff

Stripe and `.stash` handoff notes live in [docs/stripe-handoff.md](docs/stripe-handoff.md).
