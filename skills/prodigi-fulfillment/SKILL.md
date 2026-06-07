# Prodigi Fulfillment

Use this skill when `.cache` needs to quote, proof, or fulfill the active sticker POD run through Prodigi.

## Purpose

Keep the contract clear:

- `.cache` owns the storefront, order record, and pricing gate
- Prodigi owns production, proofing, and shipment after ops approval
- agents may look up SKUs, create quotes, and dry-run orders, but must not create live orders without approval

## Active sticker SKUs

| Cache SKU | Name | Batch |
| --- | --- | ---: |
| `CST-001` | Cache Mark | 50 |
| `CST-002` | Proof Label | 50 |
| `CST-003` | Seal Holo | 50 |

Map each cache SKU to a Prodigi catalog SKU through `PRODIGI_STICKER_SKUS`.

## Auth

```bash
export PRODIGI_API_KEY="<prodigi-api-key>"
export PRODIGI_BASE_URL="https://api.sandbox.prodigi.com/v4.0"
```

Use sandbox while developing. Live orders can enter production and ship.

## Preferred sequence

1. `products.get` for the target Prodigi SKU
2. `quotes.create` with the exact personalized items
3. `orders.create --dry-run` and inspect the request body
4. remove dry-run only after quote, recipient, assets, and idempotency key are approved
5. `orders.get` and `orders.actions` for follow-up mutations

## Repo surfaces

- vendored CLI/MCP: `tools/prodigi-agent-tool/`
- Convex adapter: `convex/lib/prodigi.ts`, `convex/prodigi.ts`
- ops launchpad: `/checkout` in the staff app
- runbook: `docs/prodigi-integration-plan.md`

## Boundaries

Agents can:

- inspect Prodigi catalog entries
- create quotes
- dry-run order bodies
- explain proof and pricing gates to operators

Agents must not:

- create live Prodigi orders before Stripe payment succeeds
- bypass the sticker pricing gate
- invent Prodigi SKUs when mapping is missing

## Short explanation

`.cache` is staging a three-SKU sticker POD run. Prodigi is the fulfillment provider. Price stays TBD until proof, quote, shipping, and margin are approved. The vendored Prodigi agent tool and Convex actions exist so staff and agents can inspect catalog entries and prepare quotes without forking fulfillment ops out of `.cache`.`
