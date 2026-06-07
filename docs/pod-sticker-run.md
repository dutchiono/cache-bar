# POD Sticker Run

The active `.cache` storefront is set up for a POD-backed sticker run. There are three sticker types, fifty units each, and price is intentionally TBD until the provider proof and production quote are approved.

## Active SKUs

| SKU | Name | Type | Quantity | Price |
| --- | --- | --- | ---: | --- |
| `CST-001` | Cache Mark | Die-cut vinyl sticker | 50 | TBD |
| `CST-002` | Proof Label | Matte proof label sticker | 50 | TBD |
| `CST-003` | Seal Holo | Holographic seal sticker | 50 | TBD |

## Frontend State

- `public/cache.html` and `public/data.js` are the sticker POD storefront source.
- `public/drop-001-live.html` and `public/data-drop-001.js` are the preserved OG Drop 001 demo.
- `public/pod-request.html` is the POD request flow, not a payment checkout.
- `public/checkout.html` redirects to `pod-request.html`.
- Cart and checkout totals display `TBD`, not `$0`.
- `/stash` is paused for this sticker run.

## POD Setup

- Provider: Prodigi (`tools/prodigi-agent-tool/`, `convex/lib/prodigi.ts`, `convex/prodigi.ts`)
- Create or map the three SKUs in the Prodigi catalog.
- Set `PRODIGI_API_KEY`, optional `PRODIGI_BASE_URL`, and optional `PRODIGI_STICKER_SKUS`.
- Confirm artwork export specs for cut line, bleed, transparent background, material, finish, and backing.
- Hold production until the proof is approved.
- Lock unit price only after Prodigi quote, margin, tax, and shipping rate are known.
- Update `public/data.js` and `convex/bootstrap.ts` when final prices are approved.

See [docs/prodigi-integration-plan.md](docs/prodigi-integration-plan.md).

## Self-Hosted Seed

`bunx convex run bootstrap:ensureStorefront --env-file .env.local` now seeds the sticker products and retires the prior demo apparel products from the live catalog.

Fresh seed result:

- `Cache Mark` with variant `CST-001`, on hand `50`
- `Proof Label` with variant `CST-002`, on hand `50`
- `Seal Holo` with variant `CST-003`, on hand `50`

## Pricing Gate

Do not enable paid checkout until these are known:

- approved artwork proof
- provider unit quote
- shipping rate
- tax handling
- final margin
- refund/reprint rules
