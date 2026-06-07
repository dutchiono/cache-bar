# Prodigi Integration Plan

The active sticker POD run uses Prodigi as the fulfillment provider. `.cache` keeps Stripe as the payment system of record when paid checkout is enabled, and only sends production orders to Prodigi after payment succeeds and ops approves the proof.

## What is vendored

The Go agent tool from Downloads is checked in at `tools/prodigi-agent-tool/`.

It provides:

- `prodigi-pp-cli` for non-interactive catalog lookup, quoting, and order fulfillment
- `prodigi-pp-mcp` for MCP-compatible agent tooling
- `prodigi-agent` launcher for `schema` and `call` operations

Use the sandbox base URL while developing. Live orders enter production and ship.

## Immediate setup in Prodigi

Before turning on paid checkout:

1. Create or confirm the three sticker products in Prodigi.
2. Export print-ready artwork with cut line, bleed, transparent edges, material, finish, and backing specs.
3. Copy the Prodigi API key from the developer portal.
4. Map cache SKUs to Prodigi SKUs.

## Proposed `.cache` env

Add Convex secrets for:

- `PRODIGI_API_KEY`
- `PRODIGI_BASE_URL` (optional; defaults to live `https://api.prodigi.com/v4.0`)
- `PRODIGI_STICKER_SKUS` (optional JSON map for the active sticker run)

Example sticker map:

```json
[
  { "cacheSku": "CST-001", "name": "Cache Mark", "prodigiSku": "GLOBAL-STK-..." },
  { "cacheSku": "CST-002", "name": "Proof Label", "prodigiSku": "GLOBAL-STK-..." },
  { "cacheSku": "CST-003", "name": "Seal Holo", "prodigiSku": "GLOBAL-STK-..." }
]
```

Sandbox development:

```bash
PRODIGI_BASE_URL=https://api.sandbox.prodigi.com/v4.0
```

## Convex surface

The backend adapter lives in:

- `convex/lib/prodigi.ts`
- `convex/prodigi.ts`

Staff and automation can call:

- `prodigi.configStatus`
- `prodigi.stickerCatalogSmoke`
- `prodigi.productLookup`
- `prodigi.quoteCreate`
- `prodigi.orderCreate`
- `prodigi.orderLookup`

Auth uses `X-API-Key: <PRODIGI_API_KEY>` against the configured Prodigi base URL.

## Fulfillment sequence

1. Call `products.get` for the target Prodigi SKU.
2. Use returned attributes, print areas, variants, and print dimensions to build the item payload.
3. Call `quotes.create` with the exact personalized items.
4. Dry-run the final order body.
5. Remove dry-run only after the quote, recipient, assets, and idempotency key are approved.
6. Create the Prodigi order only after Stripe payment succeeds and ops approves production.

Suggested local order metadata:

```json
{
  "source": "cache",
  "cacheOrderId": "...",
  "cacheSku": "CST-001"
}
```

Store the returned Prodigi order id on the local fulfillment row as `partnerJobId`.

## Agent usage

From the repo root:

```bash
cd tools/prodigi-agent-tool
go build -o ./bin/prodigi-pp-cli ./cmd/prodigi-pp-cli
go build -o ./bin/prodigi-pp-mcp ./cmd/prodigi-pp-mcp
export PRODIGI_API_KEY="<sandbox-or-live-key>"
export PRODIGI_BASE_URL="https://api.sandbox.prodigi.com/v4.0"
./bin/prodigi-pp-cli tool schema
./bin/prodigi-pp-cli tool call products.get --input '{"sku":"GLOBAL-CAN-10x10"}'
```

For Cursor or Claude MCP:

```json
{
  "mcpServers": {
    "prodigi": {
      "command": "prodigi-pp-mcp",
      "env": {
        "PRODIGI_API_KEY": "<your-key>",
        "PRODIGI_BASE_URL": "https://api.sandbox.prodigi.com/v4.0"
      }
    }
  }
}
```

## Relationship to Teemill

Teemill remains in the repo for legacy one-off shirt flows. The active sticker run uses Prodigi instead of Teemill catalog/orders mode.

## Pricing gate

Do not enable paid checkout until these are known:

- approved artwork proof
- Prodigi unit quote
- shipping rate
- tax handling
- final margin
- refund/reprint rules

When price is approved, update:

- `public/data.js`
- `convex/bootstrap.ts`

See also [docs/pod-sticker-run.md](docs/pod-sticker-run.md).
