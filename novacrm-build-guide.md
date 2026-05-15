# NovaMerch + ElizaOS v3 — Complete Build Guide

A full commerce platform for a merchandise store where every product is either **human-made** or **agent-made** — physical goods (t-shirts, mouse pads, print books) and digital goods (song tracks, song-title packs, ebooks) — with a customer CRM built in, full provenance tracking, royalty splits, **multi-rail payments (card + USDC on EVM and Solana)**, a **native $NOVA token** for discounts, a **treasury that off-ramps USDC to fiat to pay suppliers**, and a **spend-to-burn** token mechanism. ElizaOS v3 is embedded in two roles: a **staff copilot** and a registered **creator** that generates agent-made merch.

This document is the wireframe walkthrough, the step-by-step coding guide, and the direction guide in one place. The companion file `crm-wireframes.html` is the clickable low-fidelity wireframe — open it in a browser and click through the left nav as you read Section 3.

**Stack:** Vite + React + TypeScript (frontend) · Convex (reactive backend, DB, auth, file storage, scheduling) · Stripe (card) · USDC on an EVM chain + Solana (crypto payments) · wagmi/viem + Solana wallet-adapter (wallets) · an off-ramp provider (USDC → fiat) · multisig custody (Safe on EVM, Squads on Solana) · a print-on-demand / dropship partner (physical fulfillment) · ElizaOS v3 (embedded copilot + creator agent, via an MCP server) · **Bun** as the package manager and runtime throughout.

> **Not legal or financial advice.** Issuing a token, accepting stablecoins, off-ramping to fiat, and paying suppliers and creators across borders carry real regulatory weight — money-transmission licensing, KYC/AML on the off-ramp, securities questions around the native token, and sales-tax treatment of crypto-paid orders. Treat this guide as an engineering plan and have qualified counsel review the token and treasury design before launch.

---

## 1. Overview

NovaMerch is a commerce platform, not just a CRM — the CRM (customers, segments, LTV, activity) lives *inside* it, wired directly to orders, products, wallets and the token. The platform covers the full retail loop: a catalog of physical and digital products, a submission/review pipeline, a storefront, cart and checkout, multi-rail payments, orders, fulfillment (POD/dropship for physical, automated delivery for digital), customers and the CRM, creators (human and agent), a royalty ledger and payout runs, a treasury with USDC→fiat off-ramp, a native token with discount tiers and a burn mechanism, reporting, a no-code automation engine, and team/role administration.

Four design rules drive everything:

1. **Every product has a maker type and a provenance record.** "human-made" or "agent-made" is a first-class field, shown on the product, in reports, and on the customer-facing storefront. Agent-made products additionally store generation metadata (model, brief/prompt, seed, run id).
2. **Money is split, not lumped.** Every product carries royalty splits (creator + platform + collaborators, totaling 100%). Each paid order line accrues to a royalty ledger on **net revenue** (after $NOVA discounts); payout runs settle the ledger per period.
3. **Payments are multi-rail and the treasury is real money humans move.** Customers pay by card or USDC (EVM/Solana). USDC accrues in a multisig treasury and is off-ramped to fiat to pay suppliers, dropship and POD. The app can *propose* off-ramps and payouts; it never holds custody keys and never signs — multisig signers execute.
4. **The agent never publishes, pays, or burns.** ElizaOS can read freely (scoped) and can *generate* merch and *propose* writes/off-ramps, but a human confirms anything that publishes a product, sends a message, moves money, or runs an off-ramp. Token burns happen *only* from a customer's checkout — never from the agent or the platform.

The token model the rest of this guide assumes (your product choices): **$NOVA** exists on both an EVM chain and Solana; **holding** $NOVA unlocks discount **tiers** (tokens stay in the wallet); customers can **additionally spend** $NOVA at checkout for extra discount, and **spent tokens are burned**. There is **no revenue buy-and-burn** — only redeemed tokens are burned. Card payments stay alongside USDC.

---

## 2. Tech stack and why

| Layer | Choice | Why |
|---|---|---|
| Package manager / runtime | **Bun** | Fast installs, native TS execution, one toolchain for frontend, MCP server, and chain scripts. |
| Frontend | **Vite + React + TypeScript** | Fast dev server; an SPA suits an operator dashboard; end-to-end types from Convex. |
| Backend / DB | **Convex** | Reactive queries (catalog, orders, treasury, queues update with no polling), ACID mutations (royalty + discount math must be transactional), file storage (digital assets + statements), cron + scheduler (automations, payout runs, digital delivery, off-ramp reminders, chain polling). |
| Auth | **Convex Auth** | Native to Convex; staff roles map to identity claims used for RBAC. |
| Card payments | **Stripe** | Card/Apple Pay checkout; a webhook drives order state. |
| Crypto payments | **USDC** on one **EVM chain** + **Solana** | Stablecoin settlement. ERC-20 USDC on EVM, SPL USDC on Solana. |
| Wallet connection | **wagmi + viem** (EVM), **@solana/wallet-adapter + @solana/web3.js** (Solana) | Connect/verify customer wallets, read $NOVA balances, build payment + burn transactions client-side. |
| Chain reads / confirmation | **RPC provider per chain + an indexer/webhook** | Confirm USDC payments and $NOVA burns at finality; never trust the client's "I paid". |
| Native token | **$NOVA** — ERC-20 on EVM, SPL token on Solana | Discount tiers (hold) + spend-to-burn. Burn = transfer to a burn address (EVM) / burn instruction (SPL). |
| Treasury custody | **Safe** (EVM multisig), **Squads** (Solana multisig) | The platform never holds hot keys for treasury funds. App proposes; signers execute. |
| Off-ramp | A provider-agnostic **USDC → fiat off-ramp** (e.g. Circle, an exchange, or OTC) | Converts treasury USDC to fiat so suppliers/dropship/POD can be paid in fiat. |
| Physical fulfillment | **Print-on-demand / dropship partner** | Most agent-made physical merch is POD; dropship for the rest. Paid in fiat. |
| Digital fulfillment | **Convex file storage + signed URLs** | Song tracks, title packs and ebooks deliver as time-limited signed download links. |
| AI agent | **ElizaOS v3** | Two roles: embedded staff **copilot**, and a registered **creator agent**. |
| Agent transport | **MCP server (Bun + TypeScript)** | Wraps Convex functions as agent tools. Read tools execute; write tools return proposals. The agent can do nothing the MCP server doesn't expose, and the MCP server exposes no key-signing tool. |
| Styling | Tailwind (or CSS Modules) | Examples below assume Tailwind utility classes. |

**Why the app never holds treasury keys.** Customer USDC lands in multisig wallets (Safe / Squads). The app, the automations, and Eliza can all *prepare* an off-ramp or a payout, but the transaction is signed by humans. This is the single most important architectural decision — it means a bug, a compromised server, or a confused agent can never drain the treasury.

---

## 3. Wireframe walkthrough

Open `crm-wireframes.html`. Twenty-two screens, grouped in the left nav. Purple surfaces are ElizaOS agent surfaces; green tags mark crypto/$NOVA/treasury; the human/agent tags mark maker type.

**01 — Login / Auth.** Staff sign-in (email+password, Google SSO). Convex Auth. Customers don't sign in — they connect a wallet at checkout.

**02 — Dashboard.** Commerce + treasury KPIs (GMV with USDC share, orders with token-discount count, USDC treasury balance with fiat runway, lifetime $NOVA burned), a sales trend by maker type, a "needs attention" list (submissions, USDC ready to off-ramp, low stock), a treasury snapshot, and the **embedded Eliza briefing** — which here can propose off-ramps as well as generate merch.

**03 — Products (Catalog).** One catalog, two product types. Columns: thumbnail, title, type, category, maker tag, creator, price, stock, status.

**04 — Product Detail.** Split view. Left: media, variants & inventory, description. Right: the **Provenance panel**, the **Royalty splits panel** (must total 100%), and **Pricing & payment** (accepted rails: card, USDC-EVM, USDC-SOL; $NOVA discount eligibility).

**05 — Submissions / Review queue.** Kanban (New → Eliza pre-screened → Approved → Rejected) where human-made and agent-made merch converge. Eliza pre-screens; a human approves.

**06 — Creators.** Human and agent creators: type, identity, product count, royalties, unpaid balance, **payout method** (bank or USDC wallet).

**07 — Creator Detail.** For an agent creator: products, royalty earnings, payout history (USDC to operator wallet), and the **Agent identity panel** (ElizaOS agent id, base model, operator, payout target, reinvest %).

**08 — Orders.** Table: order #, customer, items, **payment** (card / USDC + chain), **$NOVA discount** (hold tier / spend-burn / none), total, status.

**09 — Order Detail.** Split view. Line items by maker, a **Payment & discount** block (rail, payment tx + confirmations, subtotal, hold-tier discount, $NOVA spent & burned with burn tx, total charged in USDC), the **royalty accrual** for this order (on net revenue), customer + wallet, a fulfillment timeline including payment finality and burn confirmation, and an Eliza panel.

**10 — Customers (CRM).** The CRM list with crypto columns: connected **wallets** (EVM/SOL), **$NOVA held**, **tier**, orders, LTV, segment. Segments can target by tier and wallet activity.

**11 — Customer Detail.** Order history (with payment rail), activity timeline (including $NOVA tier-crossing events), the **Wallets & $NOVA panel** (verified addresses, holdings → tier, lifetime burned), and the Eliza customer assistant.

**12 — Inventory & Fulfillment.** KPIs (low-stock SKUs, POD jobs, supplier invoices due in fiat, fiat ops balance), a low-stock table, a **Supplier funding** panel (what's due, the fiat funding source, whether an off-ramp is needed), and an Eliza off-ramp proposal. Digital products skip this screen.

**13 — Treasury & Off-ramp.** USDC balances per chain (each behind a named multisig), a fiat ops balance, off-ramp-in-progress, the **treasury ledger** (USDC in / off-ramp out / supplier payments / creator payouts), an **off-ramp jobs** table, and a **New off-ramp** form that creates a *proposal* requiring multisig signers. The app never moves the money itself.

**14 — Token & Burn.** $NOVA supply stats (initial, circulating, burned), a **burn events** table (one row per spend-to-burn at checkout, with the on-chain burn tx), a burn trend chart, the **discount tiers** config (hold thresholds → % off), and the **spend-to-burn** config (rate, per-order cap, burn destination, stacking rule). Buy-and-burn is explicitly off.

**15 — Royalties & Payouts.** The royalty ledger (accrues on **net** revenue), period totals split by maker type, and payout runs with a **method split** (USDC vs bank). Agent creators are paid USDC to their operator wallet.

**16 — Reports & Analytics.** GMV by maker type, **payment rail mix**, **$NOVA burned vs discounts given**, royalty liability trend, and the Eliza analytics narrative (which now also reasons about off-ramp timing and discount cost as a % of GMV).

**17 — Automations.** No-code flow builder. Shipped examples: "Treasury runway guard" (AI sizes an off-ramp → creates a proposal → notifies signers), "USDC payment confirmed → fulfill", "Agent merch generation batch". AI steps propose; humans execute money moves.

**18 — Storefront Preview.** The customer-facing shop with human/agent badges and a **Connect wallet for $NOVA discount** action — connecting shows the buyer their tier discount applied live across the shop.

**19 — Checkout.** Cart, **payment-method selection** (card / USDC-Solana / USDC-EVM), and the **$NOVA discount panel** — the hold-tier discount is automatic from the connected wallet snapshot; an optional **spend-to-burn slider** adds extra discount. The summary shows subtotal, tier discount, spend-to-burn discount, tax/shipping, and the USDC total; paying submits a USDC transfer plus (if tokens are spent) a burn transaction.

**20 — Team & Roles.** Staff RBAC (Admin / Catalog manager / Fulfillment / Finance / Support) with scope and Eliza access — **plus a separate "treasury rights" column**: moving USDC requires being a multisig signer, independent of app role.

**21 — Settings.** Tabs: General, Categories, Card payments, **Wallets & chains** (EVM/Solana RPCs, USDC contracts, $NOVA contracts, confirmation policy), **Treasury & off-ramp** (multisig configs, off-ramp provider, fiat account), **$NOVA & discounts** (hold tiers, spend-to-burn rate/cap, burn destination, buy-and-burn off), Fulfillment, Royalty rules, **Eliza Agent** (agent ids, MCP status, write policy, treasury access = read + propose only).

**22 — Eliza Agent (full console).** Full chat plus a context panel: the **two modes**, the MCP tools in use (read vs write-proposal — including `treasury_balances`, `burn_stats`, `fiat_runway`, `schedule_offramp`), and a run log. Eliza never moves money — it proposes off-ramps that route to multisig signers.

**Embed points for the agent:** dashboard panel, product/order/customer slide-overs, submissions pre-screen, automations AI step, treasury/inventory off-ramp proposals, and the full console — all call the same agent endpoint.

---

## 4. Data model — Convex schema

`convex/schema.ts`. Full commerce model with provenance, royalties, multi-rail payments, wallets, the token and the treasury. Trim fields you don't need for the MVP but keep the table set.

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const staffRole = v.union(
  v.literal("admin"), v.literal("catalog_manager"),
  v.literal("fulfillment"), v.literal("finance"),
  v.literal("support"), v.literal("readonly"),
);
const makerType = v.union(v.literal("human"), v.literal("agent"));
const chain = v.union(v.literal("evm"), v.literal("solana"));

export default defineSchema({
  // --- Staff identity ---
  users: defineTable({
    name: v.string(), email: v.string(), authId: v.string(),
    role: staffRole,
    elizaAccess: v.union(v.literal("full"), v.literal("scoped"), v.literal("off")),
    isMultisigSigner: v.boolean(),               // treasury right, separate from role
  }).index("by_authId", ["authId"]).index("by_email", ["email"]),

  // --- Creators (human OR agent) ---
  creators: defineTable({
    name: v.string(), type: makerType,
    status: v.union(v.literal("active"), v.literal("paused")),
    payoutMethod: v.object({
      kind: v.union(v.literal("bank"), v.literal("usdc_wallet")),
      chain: v.optional(chain),
      address: v.optional(v.string()),
      bankRef: v.optional(v.string()),
    }),
    // agent creators:
    agentId: v.optional(v.string()),
    baseModel: v.optional(v.string()),
    operatorUserId: v.optional(v.id("users")),
    reinvestPercent: v.optional(v.number()),
    capabilities: v.optional(v.array(v.string())),
  }).index("by_type", ["type"]).index("by_status", ["status"]),

  // --- Catalog ---
  products: defineTable({
    title: v.string(), description: v.string(),
    productType: v.union(v.literal("physical"), v.literal("digital")),
    category: v.string(), makerType, creatorId: v.id("creators"),
    status: v.union(
      v.literal("draft"), v.literal("in_review"),
      v.literal("approved"), v.literal("live"), v.literal("retired"),
    ),
    basePrice: v.number(), currency: v.string(),
    imageStorageIds: v.array(v.id("_storage")),
    novaDiscountEligible: v.boolean(),            // can $NOVA discounts apply to this product
    provenance: v.object({
      makerType, summary: v.string(),
      baseModel: v.optional(v.string()), provider: v.optional(v.string()),
      brief: v.optional(v.string()), seed: v.optional(v.string()),
      runId: v.optional(v.string()), generatedAt: v.optional(v.number()),
      license: v.optional(v.string()),
    }),
    royaltySplits: v.array(v.object({
      payeeCreatorId: v.optional(v.id("creators")),  // null = platform
      role: v.string(), percent: v.number(),
    })),
  })
    .index("by_status", ["status"]).index("by_creator", ["creatorId"])
    .index("by_makerType", ["makerType"]).index("by_category", ["category"])
    .searchIndex("search_title", { searchField: "title" }),

  productVariants: defineTable({
    productId: v.id("products"), sku: v.string(),
    optionLabel: v.string(), priceOverride: v.optional(v.number()),
  }).index("by_product", ["productId"]).index("by_sku", ["sku"]),

  inventory: defineTable({
    variantId: v.id("productVariants"),
    onHand: v.number(), reserved: v.number(),
    reorderPoint: v.number(), location: v.optional(v.string()),
  }).index("by_variant", ["variantId"]),

  digitalAssets: defineTable({
    productId: v.id("products"), storageId: v.id("_storage"),
    fileName: v.string(), fileType: v.string(),
  }).index("by_product", ["productId"]),

  // --- Submissions / review queue ---
  submissions: defineTable({
    productId: v.id("products"), creatorId: v.id("creators"), makerType,
    status: v.union(
      v.literal("new"), v.literal("prescreened"),
      v.literal("approved"), v.literal("rejected"),
    ),
    elizaPrescreen: v.optional(v.object({
      originalityOk: v.boolean(), ipFlags: v.array(v.string()),
      suggestedCategory: v.optional(v.string()),
      suggestedPrice: v.optional(v.number()),
      suggestedSplits: v.optional(v.any()), notes: v.string(),
    })),
    reviewerId: v.optional(v.id("users")), decidedAt: v.optional(v.number()),
  }).index("by_status", ["status"]).index("by_creator", ["creatorId"]),

  // --- Customers (the CRM) + wallets ---
  customers: defineTable({
    name: v.string(), email: v.optional(v.string()),
    segments: v.array(v.string()),
    lifetimeValue: v.number(), orderCount: v.number(),
    marketingConsent: v.boolean(), lastOrderAt: v.optional(v.number()),
    novaBurnedLifetime: v.number(),               // running total of $NOVA this customer burned
  }).index("by_email", ["email"]).index("by_segment", ["segments"]),

  wallets: defineTable({
    customerId: v.id("customers"), chain,
    address: v.string(),
    verifiedAt: v.optional(v.number()),           // proven via signature
  }).index("by_customer", ["customerId"]).index("by_address", ["address"]),

  customerActivities: defineTable({
    customerId: v.id("customers"),
    type: v.union(
      v.literal("note"), v.literal("email"), v.literal("order"),
      v.literal("nova_tier_change"), v.literal("ai_action"),
    ),
    body: v.string(), authorId: v.optional(v.id("users")),
  }).index("by_customer", ["customerId"]),

  // --- $NOVA discount config ---
  discountTiers: defineTable({
    name: v.string(),
    minTokens: v.number(),                        // hold threshold
    percentOff: v.number(),
    active: v.boolean(),
  }).index("by_active", ["active"]),

  burnConfig: defineTable({                       // single config row
    tokensPerDollar: v.number(),                  // e.g. 500 $NOVA = $1
    maxBurnPercentOfSubtotal: v.number(),         // e.g. 20
    evmBurnAddress: v.string(),
    solBurnMethod: v.string(),                    // "spl_burn_instruction"
  }),

  // --- Orders, payments, fulfillment ---
  orders: defineTable({
    number: v.string(), customerId: v.id("customers"),
    channel: v.string(),
    status: v.union(
      v.literal("awaiting_payment"), v.literal("paid"), v.literal("processing"),
      v.literal("partially_fulfilled"), v.literal("fulfilled"),
      v.literal("refunded"), v.literal("cancelled"),
    ),
    subtotal: v.number(),
    holdTierDiscount: v.number(),                 // from $NOVA holdings
    holdTierName: v.optional(v.string()),
    burnDiscount: v.number(),                     // from spend-to-burn
    novaSpentBurned: v.number(),                  // token amount burned for this order
    tax: v.number(), shipping: v.number(),
    total: v.number(), currency: v.string(),
    placedAt: v.number(),
  }).index("by_customer", ["customerId"]).index("by_status", ["status"]),

  payments: defineTable({
    orderId: v.id("orders"),
    rail: v.union(v.literal("card"), v.literal("usdc")),
    chain: v.optional(chain),                     // for usdc
    // card:
    stripePaymentIntentId: v.optional(v.string()),
    // usdc:
    txHash: v.optional(v.string()),
    fromAddress: v.optional(v.string()),
    amountUsdc: v.optional(v.number()),
    confirmations: v.optional(v.number()),
    status: v.union(
      v.literal("pending"), v.literal("confirmed"),
      v.literal("failed"), v.literal("refunded"),
    ),
  }).index("by_order", ["orderId"]).index("by_txHash", ["txHash"]),

  tokenBurns: defineTable({
    orderId: v.id("orders"), customerId: v.id("customers"),
    chain, amountTokens: v.number(),
    discountValue: v.number(),                    // $ value granted for this burn
    burnTxHash: v.string(),
    confirmedAt: v.optional(v.number()),
  }).index("by_order", ["orderId"]).index("by_burnTx", ["burnTxHash"]),

  orderItems: defineTable({
    orderId: v.id("orders"), productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")), makerType,
    quantity: v.number(), unitPrice: v.number(),
    netRevenue: v.number(),                       // line revenue after allocated discounts — royalty basis
    fulfillmentKind: v.union(
      v.literal("shipment"), v.literal("print_on_demand"),
      v.literal("dropship"), v.literal("digital_delivery"),
    ),
  }).index("by_order", ["orderId"]).index("by_product", ["productId"]),

  fulfillments: defineTable({
    orderId: v.id("orders"), orderItemId: v.id("orderItems"),
    kind: v.union(
      v.literal("shipment"), v.literal("print_on_demand"),
      v.literal("dropship"), v.literal("digital_delivery"),
    ),
    status: v.union(
      v.literal("pending"), v.literal("in_production"),
      v.literal("shipped"), v.literal("delivered"), v.literal("failed"),
    ),
    trackingNumber: v.optional(v.string()),
    partnerJobId: v.optional(v.string()),
    deliveredAssetUrl: v.optional(v.string()),
  }).index("by_order", ["orderId"]),

  // --- Royalties & payouts ---
  royaltyLedger: defineTable({
    orderItemId: v.id("orderItems"), productId: v.id("products"),
    payeeCreatorId: v.optional(v.id("creators")), role: v.string(),
    percent: v.number(), basisAmount: v.number(),  // = orderItem.netRevenue
    amount: v.number(), accruedAt: v.number(),
    payoutId: v.optional(v.id("payouts")),
  })
    .index("by_payee", ["payeeCreatorId"])
    .index("by_payout", ["payoutId"]).index("by_orderItem", ["orderItemId"]),

  payouts: defineTable({
    periodStart: v.number(), periodEnd: v.number(),
    creatorId: v.id("creators"), amount: v.number(),
    method: v.union(v.literal("bank"), v.literal("usdc_wallet")),
    chain: v.optional(chain),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("failed")),
    txHashOrRef: v.optional(v.string()),
    statementStorageId: v.optional(v.id("_storage")),
  }).index("by_creator", ["creatorId"]).index("by_status", ["status"]),

  // --- Treasury ---
  treasuryAccounts: defineTable({
    label: v.string(),
    kind: v.union(v.literal("usdc_multisig"), v.literal("fiat_ops")),
    chain: v.optional(chain),
    address: v.optional(v.string()),
    multisigConfig: v.optional(v.string()),       // "3/5 Safe" | "2/4 Squads"
    balanceCache: v.number(),                     // last-read balance (source of truth is on-chain)
  }),

  treasuryTransactions: defineTable({
    type: v.union(
      v.literal("usdc_in"), v.literal("offramp_out"),
      v.literal("supplier_payment"), v.literal("creator_payout"),
    ),
    accountId: v.id("treasuryAccounts"),
    amount: v.number(), currency: v.string(),
    chain: v.optional(chain), txHash: v.optional(v.string()),
    ref: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
  }).index("by_account", ["accountId"]).index("by_type", ["type"]),

  offRampJobs: defineTable({
    fromAccountId: v.id("treasuryAccounts"),
    amountUsdc: v.number(), expectedFiat: v.number(),
    provider: v.string(),
    status: v.union(
      v.literal("proposed"), v.literal("approved"),
      v.literal("settling"), v.literal("settled"), v.literal("failed"),
    ),
    proposedByUserId: v.optional(v.id("users")),
    proposedByAgent: v.optional(v.boolean()),
    fiatTxRef: v.optional(v.string()),
  }).index("by_status", ["status"]),

  // --- Automations ---
  automations: defineTable({
    name: v.string(), active: v.boolean(),
    trigger: v.object({ type: v.string(), config: v.any() }),
    steps: v.array(v.object({
      kind: v.union(v.literal("condition"), v.literal("action"), v.literal("ai")),
      config: v.any(),
    })),
  }).index("by_active", ["active"]),

  automationRuns: defineTable({
    automationId: v.id("automations"),
    status: v.union(v.literal("running"), v.literal("success"), v.literal("failed")),
    log: v.array(v.object({ at: v.number(), step: v.string(), detail: v.string() })),
  }).index("by_automation", ["automationId"]),

  // --- Agent ---
  agentRuns: defineTable({
    mode: v.union(v.literal("copilot"), v.literal("creator")),
    userId: v.optional(v.id("users")), creatorId: v.optional(v.id("creators")),
    summary: v.string(),
    toolCalls: v.array(v.object({ tool: v.string(), detail: v.string() })),
  }),

  agentThreads: defineTable({
    userId: v.id("users"), surface: v.string(),
    contextRef: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  agentMessages: defineTable({
    threadId: v.id("agentThreads"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("tool")),
    content: v.string(),
    proposal: v.optional(v.any()),
    proposalStatus: v.optional(
      v.union(v.literal("pending"), v.literal("confirmed"), v.literal("rejected")),
    ),
  }).index("by_thread", ["threadId"]),
});
```

Modeling notes:

- **On-chain state is never the source of truth in Convex — it's a cache.** `payments.txHash`, `tokenBurns.burnTxHash`, `treasuryAccounts.balanceCache` all mirror the chain. The chain is authoritative; an indexer/webhook reconciles Convex to it.
- **`orderItems.netRevenue` is the royalty basis.** Discounts ($NOVA hold tier + burn) are allocated across line items at order creation, so royalties accrue on what was actually earned, not the sticker price.
- **Payments are their own table.** A card order has one `payments` row with a Stripe id; a USDC order has one with a `txHash`, `chain` and `confirmations`. The order is not `paid` until the payment row is `confirmed`.
- **`tokenBurns` is one row per spend-to-burn event**, each tied to an order and carrying the on-chain burn tx. Burns are never inferred — they're recorded from a confirmed transaction.
- **Treasury rights are on `users.isMultisigSigner`, separate from `role`.** App RBAC and the power to move money are deliberately different axes.
- **`makerType` is denormalized onto `products`, `orderItems`, `submissions`** so maker-mix reports never need a join.

---

## 5. Step-by-step coding guide

Thirteen phases (0–12). Each ends with a runnable, demoable slice. Don't skip ahead — later phases assume the schema and auth from earlier ones.

### Phase 0 — Tooling and project setup

```bash
# 1. Scaffold the Vite React + TS app with Bun
bun create vite novamerch --template react-ts
cd novamerch
bun install

# 2. Convex + Convex Auth
bun add convex @convex-dev/auth
bunx convex dev          # logs in, creates the project, writes convex/ and .env.local

# 3. Routing, card payments, charts, drag-and-drop
bun add react-router-dom @stripe/stripe-js recharts @dnd-kit/core @dnd-kit/sortable

# 4. Wallets & chains — EVM + Solana
bun add wagmi viem @tanstack/react-query
bun add @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui \
        @solana/wallet-adapter-wallets @solana/spl-token

# 5. Styling
bun add -d tailwindcss postcss autoprefixer
bunx tailwindcss init -p
```

Wire providers in `src/main.tsx`: `ConvexProvider`, then the EVM stack (`WagmiProvider` + `QueryClientProvider`) and the Solana stack (`ConnectionProvider` + `WalletProvider` + `WalletModalProvider`). Keep RPC URLs and contract addresses in `.env.local` (`VITE_*`).

Run two processes while developing: `bunx convex dev` and `bun run dev`.

**Done when:** the app boots, Convex is connected, and you can open both an EVM and a Solana wallet-connect modal.

### Phase 1 — Auth and the app shell

1. Configure Convex Auth in `convex/auth.ts` (email/password + Google); wire `convex/http.ts` routes.
2. `convex/users.ts`: `getCurrentUser` (resolves identity to a `users` row, default role + `isMultisigSigner: false` on first login), `ensureUser`.
3. Build the app shell from the wireframe: `<Sidebar>`, `<TopBar>` (with the treasury balance pill), routed `<main>`, one route per screen.
4. Gate the app: `undefined` → loading; `null` → Login; otherwise the shell.

**Done when:** you can sign in, see your name, and route between empty screens.

### Phase 2 — Schema, catalog and creators

1. Paste the schema from Section 4 into `convex/schema.ts`.
2. **Creators** — `convex/creators.ts`: `list`, `get`, `createHumanCreator`, `registerAgentCreator`, `setStatus`, `setPayoutMethod` (bank or USDC wallet).
3. **Products** — `convex/products.ts`: `list`, `get`, `createDraft`, `update`, `setStatus`. **Enforce in every write:** `provenance` is complete for the maker type, and `royaltySplits` sum to exactly 100.
4. **Variants / inventory / digital assets** — CRUD; inventory only for physical, `digitalAssets` for digital.
5. Build the reusable `<RecordTable>`, the **Products** list, **Product Detail** (Provenance panel + Royalty Splits editor with a live 100% validator + accepted-rails display), **Creators** and **Creator Detail**.

**Done when:** you can create human and agent creators, create valid draft products, and open the detail screens.

### Phase 3 — Submissions and the review queue

1. `convex/submissions.ts`: `submit` (draft product → `submissions` row, product `in_review`), `attachPrescreen` (internal, Phase 12 calls it), `decide` (`requireRole(["admin","catalog_manager"])`; approve → `live`, reject → `draft` + reason).
2. Build the **Submissions kanban**.

**Done when:** a draft can be submitted, queued, and approved to `live` or rejected — reactively.

### Phase 4 — Customers, wallets and the storefront

1. **Customers** — `convex/customers.ts`: `list`, `get`, `create`, `update`, `buildSegment`. `customerActivities`: `log`, `byCustomer`.
2. **Wallets** — `convex/wallets.ts`: `linkWallet` (stores address + chain), `verifyWallet` (the client signs a nonce; the action verifies the signature, sets `verifiedAt`). A customer can link one EVM and one Solana wallet.
3. **Storefront** — `convex/storefront.ts`: `liveProducts` (filterable by `makerType`/`category`), `productPage`. Build the Storefront Preview grid with maker badges and a wallet-connect entry point.
4. **Cart** — client-side React state.

**Done when:** customers exist, can link and verify EVM/Solana wallets, and the storefront lists live products.

### Phase 5 — $NOVA token and discount tiers

1. **Config** — `convex/discounts.ts`: seed `discountTiers` (5k/-5%, 25k/-10%, 100k/-15%) and the single `burnConfig` row (500 $NOVA = $1, 20% cap, burn destinations). Admin CRUD for both → the Settings "$NOVA & discounts" tab.
2. **Read holdings** — `convex/chain.ts` actions: `getNovaBalance(chain, address)` reads the ERC-20 / SPL balance via the RPC provider. Never trust a client-supplied balance.
3. **Tier resolution** — a helper `resolveTier(balance)` → the highest tier whose `minTokens` the balance meets.
4. **Quote** — `convex/discounts.ts` `quoteDiscount({ subtotal, walletAddress, chain, spendTokens })`: snapshots the on-chain balance, resolves the hold tier, computes the optional spend-to-burn discount (clamped to the per-order cap), returns the breakdown. This is a pure read — it computes, it does not burn.
5. Build the Token & Burn screen (supply stats are read on-chain; burn events table is empty until Phase 6) and the storefront's "your tier discount" display.

**Done when:** connecting a wallet with $NOVA shows the correct tier discount, and the spend-to-burn slider produces a correct (un-applied) quote.

### Phase 6 — Checkout, payments and spend-to-burn

This phase has the most moving parts. Build it rail by rail.

1. **Discount allocation** — when an order is created, allocate `holdTierDiscount` + `burnDiscount` across line items proportionally so each `orderItem.netRevenue` is correct (this is the royalty basis in Phase 9).
2. **Card rail** — `convex/checkout.ts` `createCardIntent` (action): re-quote the discount server-side, create a Stripe PaymentIntent for the discounted total, return the client secret. Stripe webhook (`convex/http.ts`) → on `payment_intent.succeeded`: create the `orders` + `orderItems` + `payments` rows in one mutation, set `status: "paid"`.
3. **USDC rail** — the client builds the USDC transfer (viem for EVM, `@solana/spl-token` for Solana) for the re-quoted total and submits it. The client sends the `txHash` to `convex/checkout.ts` `registerUsdcPayment`, which creates an `awaiting_payment` order + a `pending` `payments` row.
4. **Spend-to-burn** — if the customer spends $NOVA, the client *also* builds a burn transaction (transfer to `evmBurnAddress` / SPL `burn` instruction) and submits it; its `txHash` is registered too.
5. **On-chain confirmation** — a cron/indexer (`convex/chain.ts`) polls or receives webhooks for the payment and burn txs. Only at **finality** does an internal mutation: verify the amount and recipient, set the `payments` row `confirmed`, create the `tokenBurns` row, flip the order to `paid`. **Never mark an order paid from the client.**
6. Build the **Checkout** screen (payment-method selector, $NOVA discount panel with the spend-to-burn slider, summary) and the **Orders** / **Order Detail** screens.

**Done when:** a card order and a USDC order (with and without spend-to-burn) both produce a `paid` order, a confirmed `payments` row, and — for burns — a `tokenBurns` row with a real burn tx; nothing is `paid` before on-chain finality.

### Phase 7 — Orders and fulfillment

1. `convex/fulfillment.ts`:
   - `digital_delivery`: on `paid`, an action generates a signed URL from the `digitalAssets` storage id, writes a `delivered` fulfillment, emails the customer.
   - `print_on_demand` / `dropship`: an action submits a job to the partner, stores `partnerJobId`; a webhook/cron advances status.
   - `shipment`: a staff task; advanced manually with a `trackingNumber`.
2. Build **Inventory & Fulfillment** (low-stock table, supplier-funding panel — the funding/off-ramp link comes alive in Phase 8).

**Done when:** paid orders fan out into fulfillments; digital auto-delivers; physical creates partner jobs.

### Phase 8 — Treasury, off-ramp and supplier funding

1. **Treasury accounts** — `convex/treasury.ts`: seed `treasuryAccounts` (USDC multisig per chain + a fiat ops account). `refreshBalances` (action) reads on-chain balances into `balanceCache` on a cron.
2. **Inflows** — extend the Phase 6 confirmation mutation to also write a `treasuryTransactions` `usdc_in` row, so the treasury ledger mirrors every confirmed USDC payment.
3. **Off-ramp** — `convex/offramp.ts`:
   - `proposeOffRamp` (mutation): creates an `offRampJobs` row `status: "proposed"` with a provider quote. Anyone with the right role — or Eliza, or an automation — can propose.
   - `approveOffRamp` (mutation): `requireRole(["admin","finance"])` **and** `isMultisigSigner`. Marks it `approved` and emits the unsigned transaction details for the multisig signers.
   - The actual USDC move is signed in Safe / Squads by humans — **outside the app**. A webhook/cron detects settlement, flips the job to `settled`, and writes an `offramp_out` + a fiat-side `treasuryTransactions` row.
4. **Supplier payments** — recorded as `supplier_payment` treasury transactions against the fiat ops account when invoices are paid.
5. Build the **Treasury & Off-ramp** screen.

**Done when:** confirmed USDC payments show in the treasury ledger, you can create an off-ramp proposal, and an admin+signer can approve it (with the actual signing happening in the multisig, then reconciled back).

### Phase 9 — Royalties and payouts

1. **Accrual** — in the Phase 6 confirmation mutation, for each `orderItem` read the product's `royaltySplits` and insert `royaltyLedger` rows on `orderItem.netRevenue` (post-discount). Atomic with the order.
2. **Refunds** — on a card refund or a USDC refund, insert *negative* `royaltyLedger` rows. Never delete. (You cannot un-burn $NOVA — spend-to-burn discounts are not reversible in token terms; refund the fiat/USDC value only.)
3. **Payout runs** — `convex/payouts.ts` `runPayout` (action, `requireRole(["admin","finance"])`): group unsettled ledger rows by creator, create a `payouts` row each, stamp the ledger rows. Routing: human creators → bank or USDC wallet per `payoutMethod`; agent creators → USDC to the operator wallet, applying `reinvestPercent`. USDC payouts are themselves multisig-signed and reconciled like off-ramps. Generate statements into file storage.
4. Build **Royalties & Payouts**.

**Done when:** every paid line accrues to the ledger on net revenue, refunds self-correct, and a payout run produces statements with correct USDC-vs-bank routing.

### Phase 10 — Reports and automations

1. **Reports** — `convex/reports.ts`, index-backed and bounded: `gmvByMakerType`, `paymentRailMix`, `novaBurnVsDiscount`, `royaltyLiabilityTrend`, `creatorLeaderboard`. Nightly snapshots via cron for heavy rollups. Build the Reports screen with `recharts`.
2. **Automation engine** — `convex/automations.ts`: `evaluateTriggers` (internal mutation, called from core mutations + a cron), `runStep` (internal action — condition / action / **ai**). Shipped automations: "Treasury runway guard", "USDC payment confirmed → fulfill", "Agent merch generation batch". Build the no-code builder UI.

**Done when:** charts show real aggregates and the three shipped automations run with inspectable logs.

### Phase 11 — Team and roles (RBAC)

1. Centralize permissions in `convex/model/auth.ts`: `requireUser`, `requireRole`, `canAccessScope`, and `requireSigner` (checks `isMultisigSigner` — used by `approveOffRamp` and payout runs).
2. Call them at the top of **every** query and mutation.
3. `convex/team.ts`: `listMembers`, `invite`, `setRole`, `setElizaAccess`, `setMultisigSigner` — all admin-only. Build Team & Roles + Settings tabs.

**Done when:** a "support" user can't touch treasury or publish products, and only admins+signers can approve off-ramps or run payouts.

### Phase 12 — ElizaOS v3: copilot + agent-as-creator

Full deep dive in Section 6. In short: stand up the **commerce MCP server**, create the **copilot** and **creator** agents, add the Convex proxy actions, build the chat component, and wire **confirm-before-write** + the **creator pipeline**. The agent's treasury tools are **read + propose only** — it can size and propose an off-ramp but never approves or signs one.

**Done when:** Eliza can answer "do we have fiat for Friday's invoice?", propose an off-ramp that routes to signers, generate merch into the submission queue, and never move money or burn a token.

---

## 6. ElizaOS v3 integration — deep dive

The agent is **embedded, not custom-built** — standard ElizaOS v3 agents connected through an MCP server. You author no plugin. The agent has **two roles**, and a hard boundary it can never cross.

### 6.1 Two roles, one boundary

| Role | What it is | Output |
|---|---|---|
| **Copilot** | A staff assistant embedded on every screen. Answers questions, drafts, recommends, proposes writes — including off-ramp proposals. | A chat reply, optionally carrying a **proposal** the user confirms. |
| **Creator** | A registered `creators` row (`type: "agent"`). Generates agent-made merch. | A **draft product + submission** with provenance and proposed splits. Never auto-published. |

**The boundary:** the agent can *read* (scoped) and *prepare* things. It cannot publish a product, send a customer message, move money, run an off-ramp, sign a multisig transaction, or burn a token. Every one of those is a human action. Burns specifically happen *only* from a customer's checkout — not from the agent, not from the platform, ever.

### 6.2 Architecture

```
  Browser (React chat component)
        |  useAction
        v
  Convex actions  convex/agent.ts (copilot)  /  convex/creatorAgent.ts (creator)
        |  HTTPS (OpenAI-compatible call, model = agent id)
        v
  ElizaOS v3 agents   copilot agent  +  creator agent (hosted)
        |  MCP protocol
        v
  Commerce MCP server  (Bun + TypeScript)
        |  Convex HTTP client, calls functions as the scoped user
        v
  Convex backend  (RBAC, royalty math, treasury reads — NO signing keys anywhere)
```

The MCP server has **no key-signing tool and no treasury-write tool**. The most powerful thing it can do for money is `schedule_offramp`, which creates a *proposal* row — the same `offRampJobs` row a human would create — that still has to be approved by an admin+signer and signed in the multisig.

### 6.3 Create the two agents

```bash
bun add -g @elizaos/cli
elizaos login
```

**Copilot agent** (`copilot.character.json`):

```jsonc
{
  "name": "Eliza — NovaMerch copilot",
  "system": "You are a commerce copilot for a merch store. Help with catalog, orders, inventory, customers, royalties and treasury. Ground every answer in tool results — never invent products, orders, balances or numbers. For any write you MUST return a proposal; never claim it is done. You may PROPOSE an off-ramp (schedule_offramp) but you can never approve, sign, or move funds — say so plainly. You never burn tokens; burns only happen at customer checkout. Respect the user's data scope.",
  "settings": { "model": "eliza-v3" }
}
```

**Creator agent** (`creator.character.json`):

```jsonc
{
  "name": "Eliza v3 — agent creator",
  "system": "You design merchandise: t-shirt graphics, mouse pad art, song titles, song-track concepts, short books. For every item: a title, description, the creative brief you worked from, and a category. Never set your own royalty above the platform cap. Everything you make enters the review queue — you never publish.",
  "settings": { "model": "eliza-v3" }
}
```

Deploy/register both → two **agent ids** + an API key. Upload knowledge-base docs (brand guide, category rules, IP policy, treasury/off-ramp policy) against the copilot agent. Then register the creator agent as a real `creators` row via `creators.registerAgentCreator` with its `agentId`, `baseModel`, `operatorUserId`, and `reinvestPercent` — this is what makes "agents as creators" concrete.

### 6.4 Build the commerce MCP server

```bash
mkdir novamerch-mcp && cd novamerch-mcp && bun init -y
bun add @modelcontextprotocol/sdk convex zod
```

`src/index.ts` (shape, not exhaustive):

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../novamerch/convex/_generated/api";
import { z } from "zod";

const server = new McpServer({ name: "novamerch-mcp", version: "1.0.0" });
function clientFor(token: string) {
  const c = new ConvexHttpClient(process.env.CONVEX_URL!);
  c.setAuth(token);
  return c;
}

// --- READ TOOL ---
server.tool(
  "fiat_runway",
  "Compare the fiat ops balance against upcoming supplier invoices.",
  {},
  async (_a, { _meta }) => {
    const convex = clientFor(_meta.userToken as string);
    const r = await convex.query(api.treasury.fiatRunwayForAgent, {});
    return { content: [{ type: "text", text: JSON.stringify(r) }] };
  },
);

// --- COPILOT WRITE TOOL: proposal only ---
server.tool(
  "schedule_offramp",
  "Propose a USDC->fiat off-ramp. Creates a proposal that admins+signers must approve. " +
  "This tool CANNOT move funds or sign anything.",
  { fromChain: z.enum(["evm", "solana"]), amountUsdc: z.number() },
  async (args) => ({
    content: [{ type: "text", text: JSON.stringify({
      __proposal: true, tool: "schedule_offramp", args,
      summary: `Propose off-ramp of ${args.amountUsdc} USDC from ${args.fromChain}`,
    }) }],
  }),
);

// --- CREATOR TOOL: submission draft, never publishes ---
server.tool(
  "create_product_submission",
  "Submit a generated product to the review queue, with provenance + proposed splits.",
  {
    title: z.string(), description: z.string(),
    productType: z.enum(["physical", "digital"]), category: z.string(),
    brief: z.string(), seed: z.string().optional(),
    suggestedPrice: z.number(),
    proposedSplits: z.array(z.object({ role: z.string(), percent: z.number() })),
  },
  async (args, { _meta }) => ({
    content: [{ type: "text", text: JSON.stringify({
      __submission: true, ...args,
      creatorAgentId: _meta.creatorAgentId, runId: _meta.runId,
    }) }],
  }),
);

// register: search_products, get_order, sales_summary, list_low_stock,
//           get_customer, treasury_balances, burn_stats (read);
//           create_reorder_task, draft_email, build_segment, schedule_offramp
//           (copilot write-proposal);
//           create_product_submission (creator).
// There is intentionally NO tool that signs, transfers, or burns.
```

Tool tiers:

| Tier | Examples | Behavior |
|---|---|---|
| **Read** | `search_products`, `get_order`, `sales_summary`, `list_low_stock`, `get_customer`, `treasury_balances`, `burn_stats`, `fiat_runway` | Calls a Convex query as the user, returns data. |
| **Copilot write (proposal)** | `create_reorder_task`, `draft_email`, `build_segment`, `schedule_offramp` | Returns `{ __proposal: true, ... }`. Never mutates. `schedule_offramp` proposals additionally require an admin+signer to approve. |
| **Creator** | `create_product_submission` | Returns `{ __submission: true, ... }`. The Convex side turns it into a draft product + `submissions` row. Never publishes. |
| **(none)** | — | No tool transfers funds, signs a multisig tx, or burns a token. This absence is the safety design. |

Connect the MCP server to **both** agents; give the creator agent only read + `create_product_submission`.

### 6.5 The Convex agent proxy (copilot)

`convex/agent.ts` — a Convex **action**, the only thing the browser talks to for copilot chat. It calls the copilot agent (`model: "agent_novamerch_copilot_v3"`), passes `metadata.userToken` so MCP tools stay permission-scoped, persists the user + assistant messages, and detects a `__proposal` in the reply to store on the `agentMessages` row as `proposalStatus: "pending"`. (Same shape as the proxy in earlier versions of this guide — unchanged by the crypto work, because the proxy never touches funds.)

### 6.6 Confirm-before-write — and the extra gate for money

1. A copilot write tool returns a `__proposal`; it's stored as a pending `agentMessages` row.
2. The chat UI renders it with a **Review & confirm** button.
3. On confirm, the client calls `agent.confirmProposal`, which **re-checks RBAC** and runs the real mutation.
4. **For `schedule_offramp` specifically:** confirming only calls `offramp.proposeOffRamp` — it creates the `offRampJobs` proposal row, nothing more. Actually moving the USDC still needs `offramp.approveOffRamp` (admin + `isMultisigSigner`) and then a human signature in Safe / Squads. So an Eliza-originated off-ramp passes through *two* human gates: confirm-the-proposal, then approve-and-sign. The agent is two steps removed from the money.

### 6.7 Creator mode — the generation pipeline

`convex/creatorAgent.ts` `generate` (action) — triggered from the UI ("Eliza: generate a product") or the "Agent merch generation batch" automation:

1. Resolve the creator agent's `creators` row; mint a `runId`.
2. Call the creator agent asking for N items; it calls `create_product_submission` once per item.
3. For each returned `__submission`, call `materializeSubmission` (internal mutation): create a `products` row `status: "draft"`, `makerType: "agent"`; build the **provenance** object (`baseModel`, `provider`, `brief`, `seed`, `runId`, `generatedAt`, `license` — all required); build `royaltySplits` from `proposedSplits` and **clamp** the agent's own share to the platform cap, normalize to 100; create a `submissions` row `status: "new"`.
4. Record the run in `agentRuns` for the audit log.

From there it's the normal Phase 3 review flow — a **human approves** before anything goes `live`. The creator agent can produce sellable inventory; it can never put it on sale.

### 6.8 Chat component and embed points

Build one `<ElizaChat thread={...} suggestions={...} />` using `useQuery(api.agent.messages)`, `useAction(api.agent.chat)`, `useMutation(api.agent.confirmProposal)`, and `useAction(api.creatorAgent.generate)`. Mount it on every surface — only the thread `surface`/`contextRef` differ: dashboard panel, product/order/customer slide-overs, submissions pre-screen, inventory/treasury off-ramp proposals, automation AI step, and the full console.

For the **automation AI step**, `runStep` calls the agent server-side. With no live user to confirm, AI steps are restricted to *read + generate + draft + recommend + propose*: the "Treasury runway guard" automation can size and *propose* an off-ramp (creating the proposal row + notifying signers), but it never approves it; a generation batch produces submissions that still need human approval.

### 6.9 Settings → Eliza Agent tab

Surface: copilot agent id, creator agent id, model, MCP server status, knowledge-base doc count, the copilot write policy ("draft & propose only — incl. off-ramp proposals"), the creator output policy ("always enters Submissions — never auto-published"), and explicitly **treasury access = read + propose only — never signs or moves funds**. Per-user `elizaAccess` gates the embed points.

---

## 7. Direction guide

### 7.1 Build sequence and milestones

| Milestone | Phases | What you can demo |
|---|---|---|
| **M1 — Walking skeleton** | 0–1 | Sign in, app shell, routing, EVM + Solana wallet modals open. |
| **M2 — Catalog spine** | 2–3 | Products with required provenance + validated splits, creators (human + agent), the submission/review queue. |
| **M3 — Wallets & token** | 4–5 | Customers, verified EVM/Solana wallets, the storefront, $NOVA discount tiers + spend-to-burn *quotes*. |
| **M4 — Selling for real** | 6–7 | Card + USDC checkout, spend-to-burn, on-chain confirmation, orders, fulfillment. The hardest milestone — budget for it. |
| **M5 — The money is correct** | 8–9 | Treasury ledger, off-ramp proposals + multisig approval, royalty accrual on net revenue, payout runs. Do not skip refund handling. |
| **M6 — Intelligence** | 10 | Reports (maker mix, rail mix, burn economics) and automations. |
| **M7 — Hardening** | 11 | RBAC + the separate multisig-signer axis. Before real users. |
| **M8 — Embedded agent** | 12 + Section 6 | Eliza as copilot (incl. off-ramp proposals) and as a creator. |

Roughly: M1 a few days; M2 a sprint; M3 a sprint (wallet verification + chain reads are fiddly); **M4 the biggest single chunk — two rails plus on-chain finality handling**; M5 a sprint (treasury reconciliation + royalty math); M6 a sprint; M7 a few days; M8 a sprint.

### 7.2 What to defer

Safe to defer: the Creator Portal (staff create on creators' behalf first), wholesale channel, multi-currency display, tax automation (flat rate first), the visual automation builder, the agent knowledge base, a third chain. **Do not defer:** required provenance, the 100%-split validator, on-chain payment confirmation at finality, multisig custody (never ship a hot-wallet treasury "for now"), the off-ramp proposal→approve→sign flow, royalty accrual, and refund correction. Those are cheap to build in from the start and ruinous to retrofit.

### 7.3 Deployment

- **Backend:** `bunx convex deploy`. Secrets in the Convex dashboard, never in `.env`: `ELIZA_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, EVM + Solana RPC URLs, USDC + $NOVA contract addresses, indexer webhook secrets, off-ramp provider keys, POD/dropship keys, mail credentials. **No private keys belong in Convex** — treasury keys live in the multisig signers' wallets only.
- **Frontend:** `bun run build` → static `dist/` to any host. `VITE_*` for Convex URL, RPC URLs, contract addresses (public values only).
- **MCP server:** deploy the Bun service always-on; register its URL with both ElizaOS agents; it should only accept calls carrying a valid token.
- **Webhooks:** Stripe, the off-ramp provider, the POD/dropship partner, and the chain indexer all point at `convex/http.ts` routes.
- **Crons:** chain balance refresh, payment/burn confirmation polling, automation triggers, payout-run + off-ramp reminders, nightly report snapshots.

### 7.4 Gotchas and risks

**Custody & keys.** Treasury USDC sits in Safe (EVM) and Squads (Solana) multisigs. The app, the automations and Eliza can only ever create *proposals*. Never put a private key in app code, an env var, or an MCP tool. The whole "agent never moves money" guarantee rests on there being no signing capability anywhere in the software.

**On-chain payment confirmation.** Never mark an order paid from the client. Wait for finality (more confirmations on EVM; finalized commitment on Solana). Handle the messy cases: underpayment, overpayment, wrong-chain sends, wrong-token sends, a tx that never confirms, and chain reorgs that un-confirm a payment you already acted on. The confirmation mutation must be idempotent — the indexer will deliver the same event twice.

**Spend-to-burn correctness.** The burn is a separate transaction from the payment; an order can have a confirmed payment but a still-pending burn (or a failed one). Decide the rule explicitly — recommended: grant the burn discount only once the burn tx is confirmed; if the burn fails, the order reprices without it. Record one `tokenBurns` row per confirmed burn tx, keyed by `burnTxHash`, so a replayed webhook can't double-count. You can never un-burn — a refund returns USDC/fiat value, not tokens.

**Discount math & netRevenue.** Allocate the hold-tier and burn discounts across line items so `orderItem.netRevenue` is right — royalties accrue on net, and a sloppy allocation either overpays creators or shorts them. Store token amounts and percentages as integers / fixed precision; never let floating point make a split sum to 99.999 or a discount drift.

**Treasury timing & off-ramp risk.** USDC inflow is lumpy; supplier invoices are scheduled. Don't hold more USDC than the runway needs, but keep enough fiat ahead of invoice dates — the "Treasury runway guard" automation exists for this. Off-ramps carry counterparty risk and settlement delay (T+1 or worse); a provider can freeze or fail a job. Have a second provider path and never let a single pending off-ramp be the only thing covering payroll-critical invoices.

**Stablecoin & token assumptions.** USDC can depeg; size buffers for it. $NOVA price is volatile — keep hold-tier thresholds denominated in *token count*, not USD, so a price swing doesn't silently move every customer between tiers mid-session. The spend-to-burn rate (500 $NOVA = $1) is a *platform-set* rate, not a market rate — be deliberate about when and how you change it, because it directly sets your discount cost.

**Burn verifiability & idempotency.** Every burn must be a real, publicly verifiable on-chain transaction recorded against its order. EVM "burn" is a transfer to a burn address; SPL burn is a burn instruction — they look different, handle both. Guard against double-burn (a retried checkout) and against recording a burn that the chain later reorgs away.

**Gas & failed transactions.** Customers pay gas on their own payment + burn txs — surface this in checkout. A burn tx can succeed while the payment fails, or vice versa; the checkout flow and the confirmation logic must cope with each leg independently.

**Refunds across rails.** Card refunds go through Stripe. USDC refunds are an outbound treasury transaction — which means they, too, need multisig approval; budget for that latency in your support workflow. All refunds insert negative `royaltyLedger` rows; none delete.

**Compliance.** This is the big one and it is not an engineering problem you can code around: accepting stablecoins, off-ramping to fiat, and paying creators cross-border can trigger money-transmitter licensing; the off-ramp provider will require KYC/AML; a discount/utility token can still be deemed a security depending on design and jurisdiction; sales tax generally still applies to crypto-paid orders at fiat-equivalent value. Get qualified legal and tax counsel on the token and treasury design before launch — the architecture here is built to *support* compliance (auditable ledgers, human-gated money movement, verifiable burns) but it does not *provide* it.

**Determinism, indexes, RBAC, automation loops.** As before: Convex queries/mutations can't use `Date.now()`/`Math.random()`/`fetch` (push chain calls, Stripe, off-ramp and agent calls into `actions`); index every query, never table-scan; RBAC helpers at the top of every function, and the separate `isMultisigSigner` gate on every treasury-moving path; add a run-depth guard so automations can't loop.

**The agent boundary.** Copilot writes are proposals; off-ramp proposals need a second human gate (approve + sign); creator output is submissions; burns come only from customer checkout. If a tool ever signs, transfers, or burns — or an AI step ever auto-approves an off-ramp — the safety model is gone. Keep humans on publish, on money, and on burns.

### 7.5 Definition of done (per phase)

A phase is done when its Convex functions have RBAC checks, its queries use indexes, the screen matches the wireframe, loading/empty states are handled, and the milestone slice demos end-to-end. Additionally — Phase 2: a product can't be saved with incomplete provenance or splits ≠ 100%. Phase 4: a wallet must be signature-verified before it counts. Phase 6: no order is `paid` before on-chain finality, the confirmation mutation is idempotent, and a failed burn reprices the order cleanly. Phase 8: the app only ever *proposes* an off-ramp; moving funds needs an admin+signer and a multisig signature. Phase 9: refunds are handled with negative ledger rows. Phase 12: no agent tool can sign/transfer/burn, an Eliza off-ramp passes two human gates, and a rejected proposal leaves the platform untouched.

---

## Files in this deliverable

- `novacrm-build-guide.md` — this document (the NovaMerch commerce-platform build guide).
- `crm-wireframes.html` — clickable low-fidelity wireframe of all 22 screens. Open in any browser; click the left nav and table rows.
