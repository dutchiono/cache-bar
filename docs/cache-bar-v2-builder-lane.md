# .cache v2 — Builder lane (additive, v1 frozen)

> **Preferred isolation (2026-06):** Separate folder + subdomain + Convex project — see **`Playground/dotcache-builder`** ([v1 boundary](../../dotcache-builder/docs/v1-boundary.md)). Production **cache-bar** stays untouched; kill the experiment by deleting builder deploy only.  
> **Goal:** Bring bot-foundry-style “describe → phased build → artifact” into .cache **without changing or risking what already ships.**  
> **Related:** [foundry-telegram-builder-handoff.md](./foundry-telegram-builder-handoff.md) (pattern map).  
> **Rule:** v1 stays the production shop. v2 is a **second product** — not a refactor of this repo unless you explicitly merge later.

---

## Split-host layout (recommended)

| | **v1** | **v2 experiment** |
| --- | --- | --- |
| Repo / folder | `cache-bar` | `dotcache-builder` |
| Site | `dotcache.bushleague.xyz` | `builder.dotcache.bushleague.xyz` |
| Convex | `impartial-herring-497` | **New project** |
| Telegram | store + manager bots | **New builder bot** |
| Nginx root | `/var/www/dotcache` | `/var/www/dotcache-builder` |

Same patterns as below, but implement in **dotcache-builder**, not by editing v1 webhooks or schema in place.

---

## v1 freeze list (do not break)

These are **production truth** today. v2 work must not alter their behavior unless you run an explicit migration project with rollback.

| Surface | What it does | Touch policy |
| --- | --- | --- |
| **Live shop** | `cache.html`, `pod-request.html`, `liveShopCatalog`, bootstrap | **No v2 logic in static shop** |
| **Checkout / Stripe** | `convex/checkout.ts`, Stripe webhook | **Read-only from v2**; proposals only |
| **Store Telegram** | `@dotCache_bot`, menu/cart/`/chat`, hybrid buttons | **No builder state in `telegramSessions`** |
| **Manager Telegram** | `@dotCache_manager_bot`, ops agent + snapshot | **Optional shared builder core later**; don’t merge carts |
| **Web concierge** | `/concierge`, `publicConciergeChat` | **Unchanged** |
| **Ops console** | `/app/agent`, staff auth | **Unchanged** |
| **Eliza path** | `askElizaAgent`, shop/manager fallbacks | **Unchanged** |
| **Capability API** | `capabilityProposals`, proposal-only writes | **v2 output lands here only** |
| **Catalog product** | Cozy Devs pack, `STICKER-PACK-001`, 50 packs | **No agent auto-publish** |
| **Deploy** | `impartial-herring-497`, dotcache.bushleague.xyz, dual TG webhooks | **v1 webhooks stay registered** |

**Convex tables v1 must keep working as-is:** `telegramSessions`, `products`, `orders`, `conciergeSessions`, `capabilityProposals`, `agentThreads`, etc.  
v2 adds **new tables only** — no column renames on `telegramSessions`, no repurposing `mode`/`cart`.

---

## What “whole second version” means here

Not a rewrite of cache-bar. A **parallel product lane**:

```
┌─────────────────────────────────────────────────────────────┐
│  v1 PRODUCTION (frozen behavior)                          │
│  Shop · cart · checkout · store/manager TG · /concierge     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  v2 BUILDER (new, opt-in)                                   │
│  /build · builderSessions · worker · proposals → staff review │
└─────────────────────────────────────────────────────────────┘
         │
         └── only writes to store via capabilityProposals + staff
```

Ship v2 behind flags. If v2 fails, turn flags off — v1 never knew it existed.

---

## Isolation tactics (how we stay safe)

### 1. New Convex namespace

Add tables with a clear prefix or domain — never overload shop session:

| Table | Purpose |
| --- | --- |
| `builderSessions` | phase, job id, progress message ids, awaiting input |
| `builderJobs` | spec, status, workspace ref, `jobKind` |
| `builderRuns` | phase log, durable pipeline state |

Optional later: `builderEvents` for audit.  
**Do not** store pipeline phase on `telegramSessions.mode`.

### 2. New HTTP routes only

Add routes; do not change v1 handlers’ contracts:

| Route | Role |
| --- | --- |
| `POST /builder/v1/jobs/start` | Convex → worker (internal auth) |
| `POST /builder/v1/jobs/progress` | Worker → Convex (updates run + TG progress) |
| `POST /builder/v1/jobs/complete` | Terminal state + proposal stub |

Existing `/telegram/webhook`, `/telegram/store/webhook`, `/telegram/manager/webhook` keep current entrypoints.

### 3. Code layout — new files first, extract later

**Phase 0 (safest):** only **new** modules:

```
convex/builder/           # all new
  sessions.ts
  jobs.ts
  runs.ts
  commands.ts             # /build, /status — not wired to store bot yet
  http.ts                 # worker callbacks
  telegramBridge.ts       # progress edit helpers

platform/builder-worker/  # fork orchestrator from bot-foundry
  (sidecar Node service)
```

**Do not** refactor `telegramStoreBot.ts` until v2 commands exist and tests pass in isolation.

**Phase 1 (optional extract):** copy shop handlers to `convex/shop/` by **move + re-export** — same exports, same behavior, diff proves zero change.

### 4. Telegram: third bot OR gated commands

Pick one for v2 (both keep v1 untouched):

| Option | Pros | Cons |
| --- | --- | --- |
| **A. Third bot** `@dotCache_builder_bot` | Zero risk to store/manager UX; own webhook `/telegram/builder/webhook` | Another BotFather token + deploy secret |
| **B. Store bot `/build`** | One bot for customers | Must route carefully; only if `BUILDER_ENABLED=true` |

**Recommendation:** **Option A for v2 beta.** Store bot stays 100% shop. When builder is stable, optionally alias `/build` on store bot as a thin forward to builder session — still separate code path.

### 5. Feature flags (Convex env)

```
BUILDER_ENABLED=false          # master kill switch
BUILDER_WORKER_URL=            # empty = v2 commands reply "not enabled"
BUILDER_TELEGRAM_BOT_TOKEN=    # only for builder bot
```

Deploy workflow: v1 secrets unchanged; builder secrets optional block in CI (skip if unset).

### 6. Worker is a separate deploy unit

Same as Prodigi/Stripe — not inside Convex webhook:

- Long phases, OpenCode/Eliza, disk workspace
- Calls Convex HTTP callbacks
- Can run on your VPS next to bot-foundry without touching dotcache nginx shop static files

v1 Convex deploy continues exactly as today when worker is down.

### 7. Store integration = proposals only

v2 **never** calls `products.insert` or mutates `liveShopCatalog.ts`.

| `jobKind` | On `ready` |
| --- | --- |
| `product-draft` | Insert `capabilityProposals` (pending) with `builderJobId` |
| `telegram-bot` | Store artifact ref + DM deploy guide |
| `capability-install` | Append provisioner step (future) |

Staff promotes in `/app` — same gate as today.

---

## Rollout phases (v2 only; v1 untouched each step)

### v2.0 — Doc + flags + empty tables

- [ ] This doc + handoff doc linked from `AGENTS.md` or `.cursor/skills/goal`
- [ ] Schema: `builderSessions`, `builderJobs`, `builderRuns` (empty)
- [ ] `BUILDER_ENABLED=false` everywhere prod
- [ ] **No webhook or store bot changes**

### v2.1 — Builder bot stub

- [ ] Third Telegram bot + `/telegram/builder/webhook`
- [ ] `/start`, `/build`, `/status` → echo + session row
- [ ] No worker yet

### v2.2 — Worker + 3 phases

- [ ] `platform/builder-worker` (preflight → scaffold → ship)
- [ ] Progress callbacks → Convex → edit Telegram message
- [ ] `/status` reads `builderRuns` from DB (survives restart)

### v2.3 — Store bridge

- [ ] `product-draft` → `capabilityProposals`
- [ ] Ops UI shows builder provenance

### v2.4 — Optional convergence

- [ ] Extract `TelegramMessenger` from store bot **only if** tests prove identical behavior
- [ ] Optional `/build` forward on store bot (flagged)
- [ ] Manager bot builder commands (shared `builderCore`)

**Promotion criteria:** v2 beta used internally for N successful jobs; zero regressions on v1 checklist (`/start`, cart, `/concierge`, checkout).

---

## v1 regression checklist (run before every v2 merge)

From `.cursor/skills/goal` — must still pass:

- [ ] `/start` on store bot — Cozy Devs pack, hybrid menu
- [ ] Add pack → cart `STICKER-PACK-001`
- [ ] `/concierge` — shop fallback replies, mobile composer
- [ ] Manager bot — agent + ops snapshot
- [ ] Webhooks: store + manager URLs unchanged
- [ ] `bootstrap:ensureStorefront` idempotent
- [ ] No new SKUs live without staff approval

---

## Git / branch strategy

| Approach | When |
| --- | --- |
| **`feature/builder-v2` long branch** | All v2 tables + builder bot + worker |
| **Small PRs into main** | Each sub-phase behind `BUILDER_ENABLED=false` |
| **No “big bang” refactor PR** | Avoid touching `telegramStoreBot.ts` + schema migrations in one PR |

Commits on main with flags off are safe: new tables and dead code paths don’t execute.

---

## What we copy from bot-foundry (into v2 lane only)

| Copy | Skip |
| --- | --- |
| Orchestrator + phase interface | JSON `.foundry-state.json` |
| Progress sink / `editMessageText` | Local PID deploy runner |
| Messenger → core split | Discord (until needed) |
| Session phase machine | Nine phases day one (use 3) |
| Deploy recovery order | Auto-publish to catalog |

Source repo: `Playground/New folder/bot-foundry`  
Target: `platform/builder-worker/` + `convex/builder/`

---

## One paragraph (for humans)

.cache v1 is the live sticker shop, dual Telegram bots, web chat, and ops console — that stays frozen. v2 is a **separate builder lane**: optional third Telegram bot, new Convex tables, and a sidecar worker that runs multi-phase builds like bot-foundry. Nothing from v2 goes live in the catalog without the same staff proposal flow you already have. Turn v2 off with an env flag and production shop behavior is unchanged.

---

## Open decision (pick before coding v2.1)

1. **Third bot vs `/build` on store bot** — recommend third bot for beta.  
2. **First `jobKind`** — `product-draft` (store-aligned) vs `telegram-bot` (foundry parity).  
3. **Worker host** — same VPS as bot-foundry vs new service name.

Document your choice at the top of the first v2 PR.
