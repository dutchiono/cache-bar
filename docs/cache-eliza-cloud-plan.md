# Cache + Eliza Cloud Plan

This is the product boundary we should ship toward:

- `.cache` is the commerce concierge.
- Eliza Cloud runs inference, agent identity, agent memory, Discord, Telegram, and waifu-facing agent runtime.
- Convex remains the commerce backend: shops, products, orders, Stripe, `.stash`, fulfillment, royalties, treasury proposals, durable retries, and crons.
- The website remains the modern storefront. The agent channel is the web3/waifu-native interface into the same backend.

## Current State

Code that exists now:

- Website chat: `src/components/CacheConcierge.tsx`
- Staff console: `src/pages/AgentConsole.tsx`
- Convex proxy: `convex/agent.ts`
- Persistent web sessions: `conciergeSessions`
- Persistent web messages: `conciergeMessages`
- Deploy env sync: `.github/workflows/deploy.yml`

The proxy supports two Eliza messaging paths:

- Plan A synchronous path: `POST /api/messaging/external-messages`
- Plan B bus-ingest path: `POST /api/messaging/ingest-external`

Source: the official elizaOS messaging docs expose `external-messages` as a processed message endpoint that can return `data.response`, while `ingest-external` accepts messages into the central message bus and returns success.

## Plan A: Eliza Cloud Is Ready

Use Eliza Cloud as the inference proxy and agent runtime.

Flow:

1. Website, ops console, Discord, Telegram, or waifu agent sends a message to Convex.
2. Convex persists the incoming message.
3. Convex calls Eliza Cloud with commerce context in metadata.
4. Eliza Cloud runs the `.cache` agent server-side.
5. Eliza returns a response or proposal.
6. Convex persists the response.
7. Any write is turned into a proposal or draft, not an automatic money or publish action.

Required env:

- `CACHE_ELIZA_BASE_URL`
- `CACHE_ELIZA_API_KEY`
- `CACHE_ELIZA_AGENT_ID`
- `CACHE_ELIZA_CHANNEL_ID`
- `CACHE_ELIZA_MODE=process` or `auto`
- Discord/Telegram secrets in the Eliza deployment

Why this is preferred:

- Model credentials stay server-side in Eliza.
- Discord and Telegram stay normal elizaOS channels.
- `.cache` keeps its commerce ledger in Convex.
- Durable commerce state stays deterministic and queryable.

## Plan B: Cloud Is Partially Ready

Use Eliza ingest mode if synchronous responses are not ready.

Flow:

1. Website or waifu channel sends a message to Convex.
2. Convex persists it locally.
3. Convex calls `/api/messaging/ingest-external`.
4. UI shows an accepted/queued response.
5. Eliza processes the message through its bus.
6. A later webhook, poll, or worker sync writes the final answer/proposal back to Convex.

Required env:

- `CACHE_ELIZA_BASE_URL`
- `CACHE_ELIZA_API_KEY`
- `CACHE_ELIZA_AGENT_ID`
- `CACHE_ELIZA_CHANNEL_ID`
- `CACHE_ELIZA_MODE=ingest`

What we still need for full Plan B:

- A callback route or polling worker from Eliza back into Convex.
- A durable `agentJobs` queue for pending, processing, failed, and complete Eliza calls.
- A cron that retries due jobs with backoff.

## Contingency: Cloud Is Not Ready

Keep Convex and the website live, but make `.cache` behave as a deterministic concierge shell.

Flow:

1. Website chat stores messages in Convex.
2. Convex returns deterministic guidance for shop setup, `.stash`, checkout, and fulfillment.
3. Ops can review visitor/shop requests in Convex.
4. Once Eliza Cloud is ready, set env and switch `CACHE_ELIZA_MODE` to `auto` or `process`.

This is not fake agent inference. It is a product-safe fallback that keeps the shop onboarding loop alive while avoiding local model credentials or invented responses.

## Durable Convex Workflows

Convex should own long-running commerce durability:

- scheduled Stripe and `.stash` reconciliation
- failed Eliza request retry
- abandoned shop onboarding follow-up
- pending fulfillment reminders
- refund and support handoff
- supplier/POD/drop-ship status sync

Eliza should own reasoning and language:

- interpret a waifu's shop request
- generate draft product copy
- propose `.stash` ratio settings
- propose fulfillment routing
- explain order status
- draft support replies

Convex should own mutation authority:

- create draft product
- create submission
- set token program config
- create Stripe session
- record order/payment/refund
- create fulfillment rows
- create treasury proposals

## Migration Path

Phase 1: Current repo

- Keep Convex commerce.
- Keep Stripe checkout.
- Keep `.stash`.
- Use website chat and ops console through `convex/agent.ts`.

Phase 2: Eliza Cloud attached

- Set Eliza env.
- Set `CACHE_ELIZA_MODE=auto`.
- Confirm web chat receives real model responses.
- Add Discord and Telegram to the same Eliza agent.

Phase 3: Waifu-native shop onboarding

- Add `shops` table scoped to waifu/agent identity.
- Add `shopSlug`, `waifuAgentId`, `waifuLaunchId`, `waifuTokenAddress`, `bscChainId`, and `treasurySafe`.
- Change storefront routes from one global shop to `/shop/:slug`.
- Let `.cache` create shop proposals from waifu agent messages.

Phase 4: Upstream waifu PR

- Add a cache-commerce integration point in `waifufun/waifu.fun`.
- Let a waifu agent call `.cache` to start a shop.
- Keep the PR small: identity handoff, token metadata handoff, shop link, and status surface.

## Non-Negotiable Boundaries

The agent can propose and draft.

The agent cannot:

- publish products directly
- move money
- issue refunds without operator path
- burn user tokens
- sign transactions
- mutate treasury balances

The user-facing promise is: the waifu talks to `.cache`; `.cache` runs the shop system; humans approve publishing and money movement.
