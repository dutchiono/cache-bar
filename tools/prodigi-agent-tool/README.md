# Prodigi CLI

CLI for prodigi

## Install

### Go

```
mkdir -p ./bin
go build -o ./bin/prodigi-pp-cli ./cmd/prodigi-pp-cli
go build -o ./bin/prodigi-pp-mcp ./cmd/prodigi-pp-mcp
```

### Binary

Download from [Releases](https://github.com/mvanhorn/printing-press-library/releases).

## Quick Start

### 1. Install

See [Install](#install) above.

### 2. Set Up Credentials

Get your API key from your API provider's developer portal. The key typically looks like a long alphanumeric string.

```bash
export PRODIGI_API_KEY="<paste-your-key>"
```

You can also persist this in your config file at `~/.config/prodigi-pp-cli/config.toml`.

### 3. Verify Setup

```bash
prodigi-pp-cli doctor
```

This checks your configuration and credentials.

### 4. Try Your First Command

```bash
prodigi-pp-cli orders
```

## Usage

<!-- HELP_OUTPUT -->

## Commands

### orders

Operations on orders

- **`prodigi-pp-cli orders cancel`** - Cancel an order
- **`prodigi-pp-cli orders create`** - Create a new order
- **`prodigi-pp-cli orders get`** - Get an order by ID
- **`prodigi-pp-cli orders get_actions`** - Get the actions currently available for an order
- **`prodigi-pp-cli orders`** - Get orders
- **`prodigi-pp-cli orders pause`** - Pause an order
- **`prodigi-pp-cli orders update_metadata`** - Update the metadata of an order
- **`prodigi-pp-cli orders update_recipient`** - Update the recipient of an order
- **`prodigi-pp-cli orders update_shipping_method`** - Update the shipping method of an order

### products

Operations on products

- **`prodigi-pp-cli products <sku>`** - Get product details by SKU
- **`prodigi-pp-cli products get_photobook_spine`** - Get photobook spine details for a product

### quotes

Operations on quotes

- **`prodigi-pp-cli quotes create`** - Create a quote for one or more items


## Output Formats

```bash
# Human-readable table (default in terminal, JSON when piped)
prodigi-pp-cli orders

# JSON for scripting and agents
prodigi-pp-cli orders --json

# Filter to specific fields
prodigi-pp-cli orders --json --select id,status,merchantReference

# Dry run — show the request without sending
prodigi-pp-cli quotes create --dry-run --destination-country-code GB --items '[{"sku":"GLOBAL-CAN-10x10","copies":1,"attributes":{"wrap":"ImageWrap"},"assets":[{"printArea":"default"}]}]'

# Agent mode — JSON + compact + no prompts in one flag
prodigi-pp-cli orders --agent
```

## Agent Usage

This CLI is designed for AI agent consumption:

- **Non-interactive** - never prompts, every input is a flag
- **Pipeable** - `--json` output to stdout, errors to stderr
- **Filterable** - `--select id,name` returns only fields you need
- **Previewable** - `--dry-run` shows the request without sending
- **Retryable** - creates return "already exists" on retry, deletes return "already deleted"
- **Confirmable** - `--yes` for explicit confirmation of destructive actions
- **Piped input** - `echo '{"key":"value"}' | prodigi-pp-cli <resource> create --stdin`
- **Cacheable** - GET responses cached for 5 minutes, bypass with `--no-cache`
- **Agent-safe by default** - no colors or formatting unless `--human-friendly` is set
- **Progress events** - paginated commands emit NDJSON events to stderr in default mode

Exit codes: `0` success, `2` usage error, `3` not found, `4` auth error, `5` API error, `7` rate limited, `10` config error.

## Non-Interactive Agent Tool

For agents, prefer the `tool` command. It is not a REPL and does not prompt. It exposes a small operation registry and accepts one JSON input object per call.

```bash
# Discover callable operations
prodigi-pp-cli tool schema

# Look up a SKU before personalization
prodigi-pp-cli tool call products.get --input '{"sku":"GLOBAL-CAN-10x10"}'

# Quote personalized items
prodigi-pp-cli tool call quotes.create --input '{
  "destinationCountryCode": "GB",
  "currencyCode": "GBP",
  "items": [
    {
      "sku": "GLOBAL-CAN-10x10",
      "copies": 1,
      "attributes": {"wrap": "ImageWrap"},
      "assets": [{"printArea": "default"}]
    }
  ]
}'

# Dry-run a fulfillment order without creating it
prodigi-pp-cli tool call orders.create --dry-run --stdin < order.json

# Check and mutate an order
prodigi-pp-cli tool call orders.actions --input '{"id":"ord_123456"}'
prodigi-pp-cli tool call orders.updateShippingMethod --input '{"id":"ord_123456","shippingMethod":"Express"}'
```

## Agent Fulfillment Workflow

Use the sandbox endpoint while developing. Live orders are produced and shipped.

```bash
export PRODIGI_API_KEY="<sandbox-or-live-key>"
export PRODIGI_BASE_URL="https://api.sandbox.prodigi.com/v4.0"
```

1. Inspect the product catalogue entry before choosing personalization fields:

```bash
prodigi-pp-cli products GLOBAL-CAN-10x10 --agent
```

Use the returned `attributes`, `printAreas`, `variants`, and `printAreaSizes` to choose valid values for `attributes`, `assets[].printArea`, sizing, and artwork dimensions.

2. Quote the personalized item before fulfillment:

```bash
prodigi-pp-cli quotes create --agent \
  --destination-country-code GB \
  --currency-code GBP \
  --items '[{"sku":"GLOBAL-CAN-10x10","copies":1,"attributes":{"wrap":"ImageWrap"},"assets":[{"printArea":"default"}]}]'
```

3. Dry-run the final order body:

```bash
prodigi-pp-cli orders create --agent --dry-run --stdin <<'JSON'
{
  "merchantReference": "agent-demo-001",
  "idempotencyKey": "agent-demo-001",
  "shippingMethod": "Budget",
  "recipient": {
    "name": "Test Recipient",
    "address": {
      "line1": "14 test place",
      "postalOrZipCode": "12345",
      "countryCode": "US",
      "townOrCity": "somewhere"
    }
  },
  "items": [
    {
      "merchantReference": "personalized-canvas",
      "sku": "GLOBAL-CAN-10x10",
      "copies": 1,
      "sizing": "fillPrintArea",
      "attributes": {"wrap": "ImageWrap"},
      "assets": [
        {
          "printArea": "default",
          "url": "https://example.com/print-ready-artwork.png"
        }
      ]
    }
  ],
  "metadata": {
    "source": "agent",
    "personalization": {
      "promptId": "demo",
      "style": "canvas"
    }
  }
}
JSON
```

Remove `--dry-run` only after the quote and request body are approved.

4. Monitor and mutate only when actions are available:

```bash
prodigi-pp-cli orders get <order-id> --agent
prodigi-pp-cli orders get_actions <order-id> --agent
prodigi-pp-cli orders update_shipping_method <order-id> --agent --shipping-method Express
prodigi-pp-cli orders update_recipient <order-id> --agent --recipient '{"name":"Updated Recipient","email":"recipient@example.com","phoneNumber":"123456780","address":{"line1":"14 test place","postalOrZipCode":"12345","countryCode":"US","townOrCity":"MyTown"}}'
prodigi-pp-cli orders update_metadata <order-id> --agent --metadata '{"source":"agent","status":"reviewed"}'
```

Photobook spine calculations use the product helper:

```bash
prodigi-pp-cli products get_photobook_spine BOOK-A4-L-HARD-M --agent --destination-country-code US --state CA --number-of-pages 50
```

## Use as MCP Server

This CLI ships a companion MCP server for use with Claude Desktop, Cursor, and other MCP-compatible tools.

### Claude Code

```bash
claude mcp add prodigi prodigi-pp-mcp -e PRODIGI_API_KEY=<your-key>
```

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "prodigi": {
      "command": "prodigi-pp-mcp",
      "env": {
        "PRODIGI_API_KEY": "<your-key>"
      }
    }
  }
}
```

## Cookbook

Common workflows and recipes:

```bash
# List resources as JSON for scripting
prodigi-pp-cli orders --json

# Filter to specific fields
prodigi-pp-cli orders --json --select id,status,merchantReference

# Dry run to preview the request
prodigi-pp-cli orders create --dry-run --stdin < order.json

# Export for backup
prodigi-pp-cli export --format jsonl > backup.jsonl
```

## Health Check

```bash
prodigi-pp-cli doctor
```

<!-- DOCTOR_OUTPUT -->

## Configuration

Config file: `~/.config/prodigi-pp-cli/config.toml`

Environment variables:
- `PRODIGI_API_KEY`
- `PRODIGI_BASE_URL` (optional; use `https://api.sandbox.prodigi.com/v4.0` for sandbox)

## Troubleshooting

**Authentication errors (exit code 4)**
- Run `prodigi-pp-cli doctor` to check credentials
- Verify the environment variable is set: `echo $PRODIGI_API_KEY`

**Not found errors (exit code 3)**
- Check the resource ID is correct
- Run the `list` command to see available items

**Rate limit errors (exit code 7)**
- The CLI auto-retries with exponential backoff
- If persistent, wait a few minutes and try again

---

Generated by [CLI Printing Press](https://github.com/mvanhorn/cli-printing-press)
