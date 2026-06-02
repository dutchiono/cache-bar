# Agent Foundry Blueprint

## Product Contract

The platform launches tokenized agents, not tokens with decorative chat windows.

One platform token anchors the network. Every child launch creates:

1. an `AGENT/PLATFORM` market;
2. an onchain agent identity;
3. a fee processor dedicated to that agent;
4. a Milady/elizaOS runtime;
5. an EVM inference wallet and optional Solana capability wallet;
6. a signed capability manifest;
7. an x402-funded bootstrap path and a recurring VVV-staking inference path.

The launchpad does not host models or operate GPUs. It still needs a thin control plane:
an indexer, provisioner, fee operator, capability registry, status API, and durable audit log.

## Economic Layer

The first deployment target is Base.

- Root market: `PLATFORM/VVV` when liquidity supports it. Use `PLATFORM/USDC` if the direct VVV route is too thin.
- Child market: `AGENT/PLATFORM`.
- Bootstrap inference: wallet-authenticated x402 USDC.
- Recurring inference: acquire and stake VVV, then use wallet-derived Venice DIEM allocation.
- Overflow inference: return to x402 when DIEM allocation is exhausted.

Agent computer is a bounded operating cost, not the product's primary revenue sink. The initial
protocol-captured child-fee allocation is:

| Allocation | Share | Purpose |
| --- | ---: | --- |
| Agent inference wallet | 10% | Maintain the configured x402 and VVV compute target |
| Shared cold-start reserve | 10% | Immediately responsive new launches |
| Protocol operations | 10% | Keepers, audits, and incident reserve |
| Launch owner | 70% | Owner revenue share |

The fee operator stops converting surplus USDC into VVV once the configured compute stake target is
met. Excess remains available for owner-directed distribution. These values remain configurable
during testnet. Production changes require a timelock.

## Contracts

| Contract | Responsibility |
| --- | --- |
| `PlatformToken` | Fixed-supply network token |
| `AgentLaunchFactory` | Atomic child launch deployment |
| `AgentToken` | Minimal cloneable ERC-20 |
| `AgentRegistry` | Canonical identity, token, pool, wallet, metadata, and runtime status mapping |
| `AgentHook` | Uniswap V4 fee and pool policy |
| `LpLocker` | Deterministic liquidity lock and LP fee claims |
| `AgentFeeProcessor` | Claims and routes the agent's protocol-captured fees |
| `ProtocolTreasury` | Multisig-controlled cold-start and incident reserve |
| `ExtensionRegistry` | Allowlisted, version-pinned launch extensions |

The Fey topology is a design reference, not a vendored dependency. Before production, retrieve
verified contract source, license terms, deployed-bytecode matches, audit reports, and hook tests.
If that cannot be done, implement the topology independently against audited Uniswap V4 primitives.

### Implemented Prototype Boundary

The first executable prototype lives under `contracts/foundry/`:

- `AgentToken.sol` is the cloneable fixed-supply child token;
- `AgentRegistry.sol` stores launch identity, inference wallet, market attachment, and runtime state;
- `AgentFeeProcessor.sol` is cloned per agent and routes collected `PLATFORM` fees under the
  snapshotted launch-time 10/10/10/70 policy. Rounding dust returns to the launch owner;
- `AgentLaunchFactory.sol` deploys a child token, registers the identity, records the initial fee
  policy, creates a market through an audited adapter when configured, and emits runtime
  provisioning requests.
- `interfaces/IAgentMarketAdapter.sol` isolates chain-specific market creation behind an audited
  boundary. Without an adapter, launch identity remains valid and a retryable market provisioning
  event is emitted.

The prototype intentionally does not include a production Uniswap V4 adapter, VVV swapper, staking
operator, or x402 top-up operator yet. That work belongs behind audited adapter boundaries instead
of unsafe placeholders.

## Offchain Services

| Service | Responsibility |
| --- | --- |
| `indexer` | Project launch, fee, staking, and runtime events into queryable state |
| `provisioner` | Create runtime instance, identity, wallets, secrets, channels, and module installs |
| `fee-operator` | Claim, swap, stake, top up x402, and reconcile |
| `status-api` | Public agent market, runtime, module, and compute status |
| `provider-venice` | Venice OpenAI-compatible provider and x402-authenticated transport |
| `capability-sdk` | Manifest schema, scopes, install state, health checks, and rollback |

### Implemented Provisioner Boundary

The first idempotent event-consumer prototype lives under `platform/provisioner/`. It journals each
completed step, rejects conflicting event replays, resumes cleanly after partial failure, assigns the
Solana capability wallet, ensures the managed runtime, installs the constrained capability registry,
and arms bootstrap inference. Its current dependencies are interfaces with in-memory test doubles;
Eliza Cloud, Steward, and x402 clients replace those doubles without changing the state machine.

### Implemented Inference Treasury Boundary

The wallet-bound treasury operator prototype lives under `platform/fee-operator/`. It journals each
reconciliation cycle, converts routed `PLATFORM` revenue into USDC, preserves the configured x402
bootstrap buffer, converts only surplus USDC into VVV, and stakes available VVV. All execution calls
carry deterministic idempotency keys so retries do not repeat completed swaps or stakes. Its
portfolio reader and Steward-backed execution client remain interfaces until testnet wiring. Its
configured x402 buffer, per-cycle conversion cap, and VVV stake target keep compute funding bounded
instead of compounding indefinitely.

### Implemented Indexer Boundary

The first contract-event projector lives under `platform/indexer/`. It creates public agent status
records from launch, market, runtime, and fee-routing events. It deduplicates repeated chain logs,
defers out-of-order events until the launch identity arrives, drains deferred events afterward, and
rejects conflicting identity replays. Its in-memory store is a test double for the durable database
adapter used by the status API.

## Launch State Machine

```text
draft
  -> transaction_pending
  -> market_created
  -> identity_registered
  -> runtime_provisioning
  -> wallets_assigned
  -> capabilities_installing
  -> bootstrap_compute_armed
  -> online
```

Failures after `market_created` must be retryable without deploying a second token or market.
Every step is idempotent and journaled against the onchain `agentId`.

## Capability Manifest

```ts
interface CapabilityManifest {
  id: string;
  version: string;
  sourceCommit: string;
  chains: ("base" | "solana")[];
  defaultMode: "enabled" | "disabled" | "operator-only";
  scopes: string[];
  secretRequirements: string[];
  walletPolicy: string;
  healthCheck: string;
  auditStatus: "prototype" | "reviewed" | "production";
}
```

Agents receive adapters, not arbitrary repositories. Wallet-signing capabilities require policy
checks outside the language model runtime. Plugins never receive unrestricted raw private keys.

The first versioned manifests live under `capabilities/manifests/`. Run
`bun run validate:capabilities` before publishing registry changes. The launchpad demo reads those
same manifests, so the visible module catalog cannot silently drift from provisioner inputs.

Run `bun run check:platform` for the complete platform gate. The production deployment workflow runs
that command before deploying Convex or uploading the website, so broken contracts, manifests,
provisioning behavior, treasury reconciliation, or index projection stop the release.

## Initial Capabilities

### `.cache`

Enable by default. The existing Convex service owns products, inventory, checkout, payment records,
fulfillment, royalties, and durable workflows. The agent may propose and explain. It may not
publish products, move treasury funds, issue refunds, burn user assets, or sign transactions.

The first adapter ingress is implemented as a Convex HTTP capability API:

- `GET /capabilities/cachebar/v1/health` is public and reports adapter readiness;
- `GET /capabilities/cachebar/v1/catalog` returns the live public catalog to authenticated agents;
- `POST /capabilities/cachebar/v1/proposals` accepts narrow, idempotent `product-draft` and
  `fulfillment-support` proposals from per-agent bearer credentials;
- `GET /capabilities/cachebar/v1/proposals?id=...` lets the proposing agent inspect review state.

Credentials live in the Convex `CACHEBAR_CAPABILITY_API_TOKENS` environment variable as an
agent-id-to-token JSON object. Agents never receive a staff session. Operator review can accept or
reject a proposal, but acceptance deliberately does not execute a publish, refund, treasury, or
wallet-signing action.

### Trading Machine

Install in watch-only mode. The first runnable adapter lives under
`platform/capabilities/trading-machine/` and starts with `bun run trading-machine:adapter`. It
binds to `127.0.0.1:7401`, keeps the existing Trading Machine service on loopback, sanitizes pool
records so wallet identities never leave the vault process, scopes pools per launched agent, and
exposes authenticated watch, simulation, and idempotent durable proposal routes. It intentionally
has no execution endpoint.

Expose capped execution only after:

- README and source behavior are reconciled;
- the local vault assumption is replaced with managed wallet policy;
- tenant isolation is added;
- every transaction receives budget, token, pool, and slippage checks;
- execution is audited and kill-switchable.

### Verse

Install disabled and operator-only. Its ARM/fire workflows create market-manipulation risk if
exposed as a default public autonomous capability. Any use requires separate policy and legal review.

### Miono and Milady

Use Miono as the state-isolated character-template pattern. Use Milady/elizaOS as the shared runtime:
plugin loading, memory, Gateway auth, managed Eliza Cloud mode, Steward wallet support, Discord,
Telegram, WebChat, and OpenAI-compatible endpoints.

## Demo Boundary

`https://foundry.bushleague.xyz/` is an interactive architecture demo. It intentionally simulates
provisioning and uses representative network records. It does not deploy tokens, request wallet
signatures, or claim that indexer-backed records already exist. The independent
`https://cachebar.bushleague.xyz/` storefront remains the working `.cache` commerce proof of concept.

## Delivery Order

1. Lock ADRs: platform token, root pair, fee policy, custody provider, Eliza Cloud provisioning API,
   permissionless versus curated launch policy, and Verse restriction.
2. Build the Base contract test harness and atomic child launch path.
3. Prove the full economic loop on testnet: launch, trade, claim, swap, x402 inference, VVV stake,
   and wallet-derived inference key.
4. Implement the event indexer and idempotent runtime provisioner.
5. Extract `capability-sdk` and ship the `.cache` adapter first.
6. Build the Venice provider adapter inside Milady/elizaOS.
7. Harden Trading Machine into watch, simulate, propose, and capped-execute modes.
8. Complete external contract audit, wallet-policy review, and incident drills before permissionless
   mainnet launches.
