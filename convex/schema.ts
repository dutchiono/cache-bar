import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ---------- shared validators ----------

export const staffRole = v.union(
  v.literal("admin"),
  v.literal("catalog_manager"),
  v.literal("fulfillment"),
  v.literal("finance"),
  v.literal("support"),
  v.literal("readonly"),
);

export const elizaAccess = v.union(
  v.literal("full"),
  v.literal("scoped"),
  v.literal("off"),
);

export const makerType = v.union(v.literal("human"), v.literal("agent"));

export const chain = v.union(v.literal("evm"), v.literal("solana"));

export default defineSchema({
  ...authTables,

  // ---------- Staff identity ----------
  users: defineTable({
    // Standard Convex Auth fields (managed by @convex-dev/auth)
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // .cache fields — defaulted on first sign-in via auth callback
    role: staffRole,
    elizaAccess,
    isMultisigSigner: v.boolean(),
  }).index("email", ["email"]),

  // ---------- Creators (human OR agent) ----------
  creators: defineTable({
    name: v.string(),
    type: makerType,
    status: v.union(v.literal("active"), v.literal("paused")),
    payoutMethod: v.object({
      kind: v.union(v.literal("bank"), v.literal("usdc_wallet")),
      chain: v.optional(chain),
      address: v.optional(v.string()),
      bankRef: v.optional(v.string()),
    }),
    // agent creators only:
    agentId: v.optional(v.string()),
    baseModel: v.optional(v.string()),
    operatorUserId: v.optional(v.id("users")),
    reinvestPercent: v.optional(v.number()),
    capabilities: v.optional(v.array(v.string())),
  })
    .index("by_type", ["type"])
    .index("by_status", ["status"]),

  // ---------- Catalog ----------
  products: defineTable({
    title: v.string(),
    description: v.string(),
    productType: v.union(v.literal("physical"), v.literal("digital")),
    category: v.string(),
    makerType: makerType,
    creatorId: v.id("creators"),
    status: v.union(
      v.literal("draft"),
      v.literal("in_review"),
      v.literal("approved"),
      v.literal("live"),
      v.literal("retired"),
    ),
    basePrice: v.number(),
    currency: v.string(),
    imageStorageIds: v.array(v.id("_storage")),
    demoImageUrls: v.optional(v.array(v.string())),
    tokenDiscountEligible: v.boolean(),
    provenance: v.object({
      makerType: makerType,
      summary: v.string(),
      baseModel: v.optional(v.string()),
      provider: v.optional(v.string()),
      brief: v.optional(v.string()),
      seed: v.optional(v.string()),
      runId: v.optional(v.string()),
      generatedAt: v.optional(v.number()),
      license: v.optional(v.string()),
    }),
    royaltySplits: v.array(
      v.object({
        payeeCreatorId: v.optional(v.id("creators")), // null = platform
        role: v.string(),
        percent: v.number(),
      }),
    ),
  })
    .index("by_status", ["status"])
    .index("by_creator", ["creatorId"])
    .index("by_makerType", ["makerType"])
    .index("by_category", ["category"])
    .searchIndex("search_title", { searchField: "title" }),

  productVariants: defineTable({
    productId: v.id("products"),
    sku: v.string(),
    optionLabel: v.string(),
    priceOverride: v.optional(v.number()),
  })
    .index("by_product", ["productId"])
    .index("by_sku", ["sku"]),

  inventory: defineTable({
    variantId: v.id("productVariants"),
    onHand: v.number(),
    reserved: v.number(),
    reorderPoint: v.number(),
    location: v.optional(v.string()),
  }).index("by_variant", ["variantId"]),

  digitalAssets: defineTable({
    productId: v.id("products"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
  }).index("by_product", ["productId"]),

  // ---------- Submissions / review queue ----------
  submissions: defineTable({
    productId: v.id("products"),
    creatorId: v.id("creators"),
    makerType: makerType,
    status: v.union(
      v.literal("new"),
      v.literal("prescreened"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    elizaPrescreen: v.optional(
      v.object({
        originalityOk: v.boolean(),
        ipFlags: v.array(v.string()),
        suggestedCategory: v.optional(v.string()),
        suggestedPrice: v.optional(v.number()),
        suggestedSplits: v.optional(v.any()),
        notes: v.string(),
      }),
    ),
    reviewerId: v.optional(v.id("users")),
    decidedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_creator", ["creatorId"]),

  // ---------- Customers (CRM) + wallets ----------
  customers: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    segments: v.array(v.string()),
    lifetimeValue: v.number(),
    orderCount: v.number(),
    marketingConsent: v.boolean(),
    lastOrderAt: v.optional(v.number()),
    tokensBurnedLifetime: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_segment", ["segments"]),

  wallets: defineTable({
    customerId: v.id("customers"),
    chain: chain,
    address: v.string(),
    verifiedAt: v.optional(v.number()), // proven via signature
  })
    .index("by_customer", ["customerId"])
    .index("by_address", ["address"]),

  customerActivities: defineTable({
    customerId: v.id("customers"),
    type: v.union(
      v.literal("note"),
      v.literal("email"),
      v.literal("order"),
      v.literal("token_tier_change"),
      v.literal("ai_action"),
    ),
    body: v.string(),
    authorId: v.optional(v.id("users")),
  }).index("by_customer", ["customerId"]),

  // ---------- Token discount config ----------
  discountTiers: defineTable({
    name: v.string(),
    minTokens: v.number(), // hold threshold
    percentOff: v.number(),
    active: v.boolean(),
  }).index("by_active", ["active"]),

  burnConfig: defineTable({
    // single config row — enforced in code
    tokensPerDollar: v.number(),
    maxBurnPercentOfSubtotal: v.number(),
    evmBurnAddress: v.string(),
    solBurnMethod: v.string(),
  }),

  tokenPrograms: defineTable({
    projectName: v.string(),
    tokenSymbol: v.string(),
    chain: chain,
    tokenKind: v.union(
      v.literal("native"),
      v.literal("erc20"),
      v.literal("spl"),
    ),
    tokenAddress: v.optional(v.string()),
    burnTarget: v.string(),
    burnMechanism: v.union(
      v.literal("transfer_to_burn"),
      v.literal("contract_burn"),
      v.literal("manual_verify"),
    ),
    discountPerTokenUsd: v.number(),
    maxDiscountUsd: v.number(),
    active: v.boolean(),
    preDropNft: v.optional(
      v.object({
        enabled: v.boolean(),
        collectionName: v.string(),
        contractOrMint: v.optional(v.string()),
        mintPriceUsdc: v.number(),
        discountPercent: v.number(),
      }),
    ),
    notes: v.optional(v.string()),
  })
    .index("by_active", ["active"])
    .index("by_chain", ["chain"]),

  // ---------- Orders, payments, fulfillment ----------
  orders: defineTable({
    number: v.string(),
    customerId: v.id("customers"),
    channel: v.string(),
    status: v.union(
      v.literal("awaiting_payment"),
      v.literal("paid"),
      v.literal("processing"),
      v.literal("partially_fulfilled"),
      v.literal("fulfilled"),
      v.literal("refunded"),
      v.literal("cancelled"),
    ),
    subtotal: v.number(),
    holdTierDiscount: v.number(),
    holdTierName: v.optional(v.string()),
    burnDiscount: v.number(),
    tokensSpentBurned: v.number(),
    tax: v.number(),
    shipping: v.number(),
    total: v.number(),
    currency: v.string(),
    placedAt: v.number(),
  })
    .index("by_customer", ["customerId"])
    .index("by_status", ["status"]),

  payments: defineTable({
    orderId: v.id("orders"),
    rail: v.union(v.literal("card"), v.literal("usdc"), v.literal("x402")),
    chain: v.optional(chain),
    // card:
    stripePaymentIntentId: v.optional(v.string()),
    // usdc:
    txHash: v.optional(v.string()),
    fromAddress: v.optional(v.string()),
    amountUsdc: v.optional(v.number()),
    confirmations: v.optional(v.number()),
    x402: v.optional(
      v.object({
        scheme: v.string(),
        network: v.string(),
        asset: v.string(),
        payTo: v.string(),
        facilitatorUrl: v.string(),
        resource: v.string(),
        paymentId: v.string(),
        price: v.string(),
        description: v.string(),
      }),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("failed"),
      v.literal("refunded"),
    ),
  })
    .index("by_order", ["orderId"])
    .index("by_txHash", ["txHash"]),

  tokenBurns: defineTable({
    orderId: v.id("orders"),
    customerId: v.id("customers"),
    programId: v.optional(v.id("tokenPrograms")),
    chain: chain,
    amountTokens: v.number(),
    discountValue: v.number(),
    walletAddress: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("verified"), v.literal("failed")),
    ),
    burnTxHash: v.optional(v.string()),
    confirmedAt: v.optional(v.number()),
  })
    .index("by_order", ["orderId"])
    .index("by_program", ["programId"])
    .index("by_burnTx", ["burnTxHash"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    makerType: makerType,
    quantity: v.number(),
    unitPrice: v.number(),
    netRevenue: v.number(), // post-discount; royalty basis
    fulfillmentKind: v.union(
      v.literal("shipment"),
      v.literal("print_on_demand"),
      v.literal("dropship"),
      v.literal("digital_delivery"),
    ),
  })
    .index("by_order", ["orderId"])
    .index("by_product", ["productId"]),

  fulfillments: defineTable({
    orderId: v.id("orders"),
    orderItemId: v.id("orderItems"),
    kind: v.union(
      v.literal("shipment"),
      v.literal("print_on_demand"),
      v.literal("dropship"),
      v.literal("digital_delivery"),
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("in_production"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("failed"),
    ),
    trackingNumber: v.optional(v.string()),
    partnerJobId: v.optional(v.string()),
    deliveredAssetUrl: v.optional(v.string()),
  }).index("by_order", ["orderId"]),

  // ---------- Royalties & payouts ----------
  royaltyLedger: defineTable({
    orderItemId: v.id("orderItems"),
    productId: v.id("products"),
    payeeCreatorId: v.optional(v.id("creators")),
    role: v.string(),
    percent: v.number(),
    basisAmount: v.number(), // = orderItem.netRevenue
    amount: v.number(),
    accruedAt: v.number(),
    payoutId: v.optional(v.id("payouts")),
  })
    .index("by_payee", ["payeeCreatorId"])
    .index("by_payout", ["payoutId"])
    .index("by_orderItem", ["orderItemId"]),

  payouts: defineTable({
    periodStart: v.number(),
    periodEnd: v.number(),
    creatorId: v.id("creators"),
    amount: v.number(),
    method: v.union(v.literal("bank"), v.literal("usdc_wallet")),
    chain: v.optional(chain),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("failed"),
    ),
    txHashOrRef: v.optional(v.string()),
    statementStorageId: v.optional(v.id("_storage")),
  })
    .index("by_creator", ["creatorId"])
    .index("by_status", ["status"]),

  // ---------- Treasury ----------
  treasuryAccounts: defineTable({
    label: v.string(),
    kind: v.union(v.literal("usdc_multisig"), v.literal("fiat_ops")),
    chain: v.optional(chain),
    address: v.optional(v.string()),
    multisigConfig: v.optional(v.string()), // "3/5 Safe" | "2/4 Squads"
    balanceCache: v.number(),
  }),

  treasuryTransactions: defineTable({
    type: v.union(
      v.literal("usdc_in"),
      v.literal("offramp_out"),
      v.literal("supplier_payment"),
      v.literal("creator_payout"),
    ),
    accountId: v.id("treasuryAccounts"),
    amount: v.number(),
    currency: v.string(),
    chain: v.optional(chain),
    txHash: v.optional(v.string()),
    ref: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("failed"),
    ),
  })
    .index("by_account", ["accountId"])
    .index("by_type", ["type"]),

  offRampJobs: defineTable({
    fromAccountId: v.id("treasuryAccounts"),
    amountUsdc: v.number(),
    expectedFiat: v.number(),
    provider: v.string(),
    status: v.union(
      v.literal("proposed"),
      v.literal("approved"),
      v.literal("settling"),
      v.literal("settled"),
      v.literal("failed"),
    ),
    proposedByUserId: v.optional(v.id("users")),
    proposedByAgent: v.optional(v.boolean()),
    fiatTxRef: v.optional(v.string()),
  }).index("by_status", ["status"]),

  // ---------- Automations ----------
  automations: defineTable({
    name: v.string(),
    active: v.boolean(),
    trigger: v.object({ type: v.string(), config: v.any() }),
    steps: v.array(
      v.object({
        kind: v.union(
          v.literal("condition"),
          v.literal("action"),
          v.literal("ai"),
        ),
        config: v.any(),
      }),
    ),
  }).index("by_active", ["active"]),

  automationRuns: defineTable({
    automationId: v.id("automations"),
    status: v.union(
      v.literal("running"),
      v.literal("success"),
      v.literal("failed"),
    ),
    log: v.array(
      v.object({
        at: v.number(),
        step: v.string(),
        detail: v.string(),
      }),
    ),
  }).index("by_automation", ["automationId"]),

  // ---------- Agent ----------
  agentRuns: defineTable({
    mode: v.union(v.literal("copilot"), v.literal("creator")),
    userId: v.optional(v.id("users")),
    creatorId: v.optional(v.id("creators")),
    summary: v.string(),
    toolCalls: v.array(
      v.object({ tool: v.string(), detail: v.string() }),
    ),
  }),

  agentThreads: defineTable({
    userId: v.id("users"),
    surface: v.string(),
    contextRef: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  agentMessages: defineTable({
    threadId: v.id("agentThreads"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("tool"),
    ),
    content: v.string(),
    proposal: v.optional(v.any()),
    proposalStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("rejected"),
      ),
    ),
  }).index("by_thread", ["threadId"]),
});
