# Tools

## Prodigi agent tool

Vendored from the Prodigi print-on-demand agent CLI/MCP package.

Location: `tools/prodigi-agent-tool/`

Build:

```bash
cd tools/prodigi-agent-tool
go build -o ./bin/prodigi-pp-cli ./cmd/prodigi-pp-cli
go build -o ./bin/prodigi-pp-mcp ./cmd/prodigi-pp-mcp
```

Docs:

- `tools/prodigi-agent-tool/README.md`
- `tools/prodigi-agent-tool/AGENT_TOOL.md`
- `docs/prodigi-integration-plan.md`
- `skills/prodigi-fulfillment/SKILL.md`

Convex adapter:

- `convex/lib/prodigi.ts`
- `convex/prodigi.ts`
