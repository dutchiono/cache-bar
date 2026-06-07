---
name: goal
description: >-
  Work through cache-bar goals methodically — verify live product truth, fix
  Telegram hybrid bot (conversation + buttons), align catalog with Convex
  checkout, and validate end-to-end before declaring done. Use when the user
  invokes /goal, says "work this out properly", or reports Telegram/shop/agent
  issues that span multiple systems.
---

# /goal — Work It Out Properly

Take your time. Do not patch one symptom and stop. Follow this workflow until the user's goal is actually met in production.

## Mindset

- **One source of truth for the live product** — bootstrap + checkout in Convex (`Cozy Devs Sticker Pack`, `STICKER-PACK-001`, 50 packs, Moon Seal + Floppy + Bus Riot). Not three separate CST SKUs unless the user explicitly changed the product.
- **Telegram is hybrid** — conversational replies AND inline buttons together. Never button-only or chat-only unless the user explicitly chose that path.
- **One dotCache Eliza agent everywhere** — web `/concierge`, ops console, store TG `/chat`, manager TG all route through `askElizaAgent()` (messaging API), not raw `chat/completions`.

## Workflow

Copy and track:

```
Goal progress:
- [ ] 1. Restate the user's goal in one sentence
- [ ] 2. Map systems involved (TG webhook, Convex, Eliza, static shop, env)
- [ ] 3. Find source-of-truth data (bootstrap.ts, checkout.ts, liveShopCatalog.ts)
- [ ] 4. Fix catalog + copy alignment first
- [ ] 5. Fix conversational path (Eliza API + local fallback)
- [ ] 6. Fix button/shop path (telegramBot.ts)
- [ ] 7. Deploy Convex; confirm webhook registered
- [ ] 8. Validate: /start, shop question, add pack, website link
- [ ] 9. Report what was wrong, what changed, what user should test
```

## Step details

### 1–2. Goal and systems

| System | What to check |
|--------|----------------|
| Telegram webhook | `getWebhookInfo` → must be `{CONVEX_SITE}/telegram/webhook` |
| Convex bot | `convex/telegramBot.ts`, `convex/lib/liveShopCatalog.ts` |
| Chat inference | `convex/lib/elizaAgent.ts` → `askDotCache()` in `elizaCloudChat.ts`; falls back to `shopConcierge.ts` / `managerConcierge.ts` |
| Web chat | `/concierge` → `agent.publicConciergeChat` → same `askElizaAgent()` |
| Ops console | `/app/agent` → `agent.chat` → same `askElizaAgent()` |
| Live product | `convex/bootstrap.ts`, `convex/checkout.ts` — single 3-pack |
| Eliza Cloud | Telegram automation must be **disabled** (Convex owns the bot) |
| Static shop | `public/cache.html` — should match pack story |

### 3–4. Catalog alignment

- Telegram catalog must match checkout: **one pack**, not CST-001/002/003 as separate buyable SKUs.
- Shared catalog lives in `convex/lib/liveShopCatalog.ts`.
- Local conversational copy in `convex/lib/shopConcierge.ts`.

### 5. Conversational path

All surfaces call `askElizaAgent()` (`/api/messaging/external-messages`, then ingest fallback). When Eliza is down or billing fails:

1. Use `shopConversationalReply()` / `managerConversationalReply()` — never show "couldn't reach the model" without a useful answer.
2. Do **not** use raw `chat/completions` or `openai/{agentId}` as model.
3. Keep hybrid on store bot: reply text + contextual inline keyboard.

### 6. Button path

- `/start` → welcome naming the **Cozy Devs Sticker Pack**
- Shop button → pack detail + what's inside (3 stickers)
- Add pack → cart with `STICKER-PACK-001`
- Website → `cache.html` / `pod-request.html`

### 7. Deploy

```powershell
bun x convex deploy --yes
```

Re-register webhook if needed (PowerShell JSON):

```powershell
$json = '{"url":"https://<deployment>.convex.site/telegram/webhook","allowed_updates":["message","callback_query"]}'
curl.exe -sS -X POST "https://api.telegram.org/bot<token>/setWebhook" -H "Content-Type: application/json" -d $json
```

Never set `CONVEX_SITE_URL` via `convex env set` — it is built-in.

### 8. Validation checklist

- `/start` shows pack name and hybrid intro
- `whats in the shop?` → conversational answer about **one 3-pack**, plus pack/cart buttons
- Tap **Sticker pack** → Moon Seal, Floppy, Bus Riot listed
- **Add pack** → cart shows Cozy Devs Sticker Pack × 1
- `/concierge` on web uses same agent as Telegram and ops console

## Anti-patterns

- Inventing fake product SKUs or studio copy not in bootstrap
- Routing all shop questions to button menus with no conversational answer
- Declaring done after push without checking webhook + logs
- Re-enabling Eliza org telegram automation while Convex owns the webhook

## Dual Telegram bots

| Bot | Env | Webhook | Audience |
|-----|-----|---------|----------|
| **Store** | `TELEGRAM_BOT_TOKEN` | `/telegram/webhook` | Customers — simple shop + chat |
| **Manager** | `TELEGRAM_MANAGER_BOT_TOKEN` | `/telegram/manager/webhook` | Operators — orders, fulfillment, catalog |

Eliza org telegram automation must stay **disabled** — Convex owns both webhooks.

## Reference files

- `convex/telegramStoreBot.ts` — customer shop bot
- `convex/telegramManagerBot.ts` — ops / fulfillment bot
- `convex/lib/liveShopCatalog.ts` — live product truth for TG
- `convex/lib/shopConcierge.ts` — local conversational fallback
- `convex/lib/elizaAgent.ts` — unified Eliza messaging API client
- `convex/lib/elizaCloudChat.ts` — Telegram wrapper + local fallbacks
- `src/pages/ConciergePage.tsx` — public web chat (same agent)
- `convex/bootstrap.ts` — seeded catalog truth
- `.github/workflows/deploy.yml` — deploy + webhook registration
