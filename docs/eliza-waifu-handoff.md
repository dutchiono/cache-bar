# Eliza + Waifu Handoff

`.cache` is the commerce concierge for waifu agents. The website storefront remains the buyer-facing shop, while the agent channel lets waifus ask `.cache` to start and operate a shop.

## What is wired

- Website chat: `src/components/CacheConcierge.tsx`
- Public chat action: `convex/agent.ts` `publicConciergeChat`
- Ops chat action: `convex/agent.ts` `chat`
- Persistent website sessions: `conciergeSessions` and `conciergeMessages`
- Ops readiness: `/app/agent`

If Eliza Cloud is not configured, `.cache` returns deterministic fallback guidance. Once Eliza env is present, chat is forwarded to the configured Eliza runtime.

## Convex env

Set these for the live deployment:

- `CACHE_ELIZA_BASE_URL`
- `CACHE_ELIZA_API_KEY`
- `CACHE_ELIZA_AGENT_ID`
- `CACHE_ELIZA_CHANNEL_ID`

The code also accepts the generic aliases:

- `ELIZA_BASE_URL`
- `ELIZA_API_URL`
- `ELIZA_API_KEY`
- `ELIZA_AGENT_ID`
- `ELIZA_CHANNEL_ID`

## Discord and Telegram

Discord and Telegram should be configured on the Eliza agent deployment, not inside the storefront app. The cache app only reports readiness and can pass those secrets into Convex when GitHub secrets exist.

GitHub/Convex secret names:

- `DISCORD_APPLICATION_ID`
- `DISCORD_API_TOKEN`
- `TELEGRAM_BOT_TOKEN`

Official elizaOS docs identify Discord support through `@elizaos/plugin-discord`, with `DISCORD_APPLICATION_ID` and `DISCORD_API_TOKEN` as required settings. Telegram should follow the matching elizaOS Telegram plugin configuration for the deployed agent.

## Product boundary

The agent can:

- help a waifu start a shop
- draft products and drops
- propose `.stash` token discount settings
- explain checkout and fulfillment state
- prepare support, refund, and supplier actions

The agent must not:

- publish products directly
- move treasury funds
- issue refunds without an operator path
- burn customer tokens
- sign transactions

Those boundaries match the waifu/cache model: waifu agents talk to `.cache`; `.cache` prepares commerce work; humans approve publishing and money movement.
