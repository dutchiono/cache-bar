# Foundry Demo Control Plane

`https://foundry.bushleague.xyz/` uses a durable Convex-backed architecture demo. It remains an
honest simulation: the public launch button does not deploy a token, request a wallet signature, or
provision a paid runtime.

## Public HTTP surface

The Foundry static site calls the Convex site URL:

- `GET /foundry/v1/network` returns recent durable simulations followed by the `.cache`, Trading
  Machine, and Miono reference fixtures.
- `POST /foundry/v1/demo/launch` creates an idempotent simulated launch and its durable audit trail.
- `GET /foundry/v1/demo/launch?id=...` reads one durable simulation and its ordered audit events.
- `OPTIONS /foundry/v1/demo/launch` serves browser CORS preflight.

Public launch requests must include an `Idempotency-Key`. Browser writes are accepted only from the
Foundry production hostname and local Vite development origins. The API hashes the visitor network
fingerprint, permits five new simulations per hour per fingerprint, and opportunistically removes
simulations and rate-limit rows older than seven days.

## Capability boundary

Public demo launches may select:

- `.cache commerce`
- Trading Machine watch/simulate/propose

Verse remains visible in the registry but disabled in the public picker because its execution
workflows remain operator-only.

## Frontend behavior

The page labels API-created records as `durable simulation`. If the Convex HTTP surface is
unavailable, the page preserves a clearly labeled local fallback simulation instead of pretending a
record was persisted.

`VITE_FOUNDRY_API_URL` optionally overrides the Convex site URL at build time. The current production
fallback is the `.cache` production Convex site.

## Production replacement path

The durable simulation tables are not the production indexer. Once the Base market adapter is
deployed, the public status API should read contract-indexed `AgentLaunchRequested`,
`MarketProvisioned`, `RuntimeStatusUpdated`, and `FeesRouted` projections. Keep the current response
shape so the Foundry site does not need to know whether a record came from the demo control plane or
the chain indexer.
