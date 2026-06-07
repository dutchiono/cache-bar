# Prodigi Agent Tool

Standalone non-interactive tool for Prodigi catalogue lookup, personalization planning, quoting, and order fulfillment.

## Location

```bash
/Users/home/Documents/dev_tools/prodigi-agent-tool
```

## Auth

```bash
export PRODIGI_API_KEY="<prodigi-api-key>"
export PRODIGI_BASE_URL="https://api.sandbox.prodigi.com/v4.0"
```

Use the sandbox base URL while developing. Live orders can enter production and ship.

## Agent Interface

```bash
/Users/home/Documents/dev_tools/prodigi-agent schema
/Users/home/Documents/dev_tools/prodigi-agent call products.get --input '{"sku":"GLOBAL-CAN-10x10"}'
```

From inside the tool directory:

```bash
./prodigi-agent schema
./prodigi-agent call products.get --input '{"sku":"GLOBAL-CAN-10x10"}'
./prodigi-agent call quotes.create --stdin < quote.json
./prodigi-agent call orders.create --dry-run --stdin < order.json
```

The launcher maps directly to:

```bash
./bin/prodigi-pp-cli tool "$@"
```

## Fulfillment Sequence

1. Call `products.get` for the target SKU.
2. Use returned attributes, print areas, variants, and print dimensions to build the item payload.
3. Call `quotes.create` with the exact personalized items.
4. Call `orders.create --dry-run` and inspect the request body.
5. Remove `--dry-run` only after the quote, recipient, assets, and idempotency key are approved.
6. Call `orders.actions` before cancellation, pause, recipient update, shipping update, or metadata update.

## Useful Operations

- `products.get`
- `products.spine`
- `quotes.create`
- `orders.list`
- `orders.get`
- `orders.actions`
- `orders.create`
- `orders.cancel`
- `orders.pause`
- `orders.updateShippingMethod`
- `orders.updateRecipient`
- `orders.updateMetadata`
