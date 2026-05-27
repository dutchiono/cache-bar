import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { requireRole, requireUser } from "./model/auth";

const paymentRail = v.union(v.literal("usdc"), v.literal("x402"));
const paymentNetwork = v.union(v.literal("base"), v.literal("solana"));
const paymentIntentArgs = {
  productId: v.id("products"),
  variantId: v.optional(v.id("productVariants")),
  quantity: v.number(),
  customerName: v.string(),
  customerEmail: v.string(),
  rail: paymentRail,
  network: paymentNetwork,
  fromAddress: v.optional(v.string()),
  tokenProgramId: v.optional(v.id("tokenPrograms")),
  burnAmountTokens: v.optional(v.number()),
  burnWalletAddress: v.optional(v.string()),
};

const x402Networks = {
  base: {
    chain: "evm" as const,
    caip2: "eip155:8453",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    fallbackPayTo: "0xCacHe0000000000000000000000000000000bAr",
  },
  solana: {
    chain: "solana" as const,
    caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    asset: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    fallbackPayTo: "CACHEbarDemo1111111111111111111111111111",
  },
};

const facilitatorUrl = "https://x402.org/facilitator";

export const storefrontProducts = query({
  args: {},
  handler: async (ctx) => {
    return await listLiveStorefrontProducts(ctx);
  },
});

export const publicStorefrontProducts = query({
  args: {},
  handler: async (ctx) => {
    return await listLiveStorefrontProducts(ctx);
  },
});

export const recentOrders = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "finance", "support"]);
    const orders = await ctx.db.query("orders").collect();
    return await Promise.all(
      orders
        .sort((a, b) => b.placedAt - a.placedAt)
        .slice(0, 50)
        .map(async (order) => {
          const customer = await ctx.db.get(order.customerId);
          const payments = await ctx.db
            .query("payments")
            .withIndex("by_order", (q) => q.eq("orderId", order._id))
            .collect();
          const items = await ctx.db
            .query("orderItems")
            .withIndex("by_order", (q) => q.eq("orderId", order._id))
            .collect();
          return { ...order, customer, payments, items };
        }),
    );
  },
});

export const createPaymentIntent = mutation({
  args: paymentIntentArgs,
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await createPaymentIntentRecord(ctx, args);
  },
});

export const createPublicPaymentIntent = mutation({
  args: paymentIntentArgs,
  handler: async (ctx, args) => {
    return await createPaymentIntentRecord(ctx, args);
  },
});

async function createPaymentIntentRecord(
  ctx: MutationCtx,
  args: {
    productId: Id<"products">;
    variantId?: Id<"productVariants">;
    quantity: number;
    customerName: string;
    customerEmail: string;
    rail: "usdc" | "x402";
    network: "base" | "solana";
    fromAddress?: string;
    tokenProgramId?: Id<"tokenPrograms">;
    burnAmountTokens?: number;
    burnWalletAddress?: string;
  },
) {
  if (!Number.isInteger(args.quantity) || args.quantity < 1) {
    throw new Error("Quantity must be at least 1.");
  }

  const product = await ctx.db.get(args.productId);
  if (!product) throw new Error("Product not found.");
  if (product.status !== "live") {
    throw new Error("Only live products can be checked out.");
  }

  let variant = null;
  if (args.variantId) {
    variant = await ctx.db.get(args.variantId);
    if (!variant) throw new Error("Variant not found.");
    if (variant.productId !== product._id) {
      throw new Error("Variant does not belong to the selected product.");
    }
  }

  const customer = await findOrCreateCustomer(ctx, args.customerEmail, args.customerName);
  const unitPrice = variant?.priceOverride ?? product.basePrice;
  const subtotal = unitPrice * args.quantity;
  const shipping = product.productType === "physical" ? 9 : 0;
  const fulfillmentKind =
    product.productType === "digital" ? "digital_delivery" : "print_on_demand";

  if (variant) {
    await reserveInventoryIfNeeded(ctx, variant._id, args.quantity);
  }

  const burnQuote = await quoteBurnDiscount(ctx, {
    productEligible: product.tokenDiscountEligible,
    programId: args.tokenProgramId,
    amountTokens: args.burnAmountTokens,
    subtotal,
  });
  const orderId = await ctx.db.insert("orders", {
    number: await nextOrderNumber(ctx),
    customerId: customer,
    channel: args.rail === "x402" ? "x402_checkout" : "usdc_checkout",
    status: "awaiting_payment",
    subtotal,
    holdTierDiscount: 0,
    burnDiscount: burnQuote.discount,
    tokensSpentBurned: burnQuote.amountTokens,
    tax: 0,
    shipping,
    total: subtotal - burnQuote.discount + shipping,
    currency: "USD",
    placedAt: Date.now(),
  });

  const netRevenue = subtotal - burnQuote.discount;
  const orderItemId = await ctx.db.insert("orderItems", {
    orderId,
    productId: product._id,
    variantId: variant?._id,
    makerType: product.makerType,
    quantity: args.quantity,
    unitPrice,
    netRevenue,
    fulfillmentKind,
  });
  await ctx.db.insert("fulfillments", {
    orderId,
    orderItemId,
    kind: fulfillmentKind,
    status: "pending",
  });
  await createRoyaltyLedgerEntries(ctx, {
    product,
    orderItemId,
    netRevenue,
  });

  const network = x402Networks[args.network];
  const payTo = await receivingAddress(ctx, network.chain);
  const paymentId = `pay_${orderId}_${Date.now()}`;
  const total = subtotal - burnQuote.discount + shipping;
  const itemDescriptor = variant ? `${product.title} / ${variant.optionLabel}` : product.title;

  if (burnQuote.program) {
    await ctx.db.insert("tokenBurns", {
      orderId,
      customerId: customer,
      programId: burnQuote.program._id,
      chain: burnQuote.program.chain,
      amountTokens: burnQuote.amountTokens,
      discountValue: burnQuote.discount,
      walletAddress: args.burnWalletAddress,
      status: "pending",
    });
  }

  const paymentIdDoc = await ctx.db.insert("payments", {
    orderId,
    rail: args.rail,
    chain: network.chain,
    fromAddress: args.fromAddress,
    amountUsdc: total,
    confirmations: 0,
    status: "pending",
    x402:
      args.rail === "x402"
        ? {
            scheme: "exact",
            network: network.caip2,
            asset: network.asset,
            payTo,
            facilitatorUrl,
            resource: `/checkout/orders/${orderId}`,
            paymentId,
            price: `$${total.toFixed(2)}`,
            description: `.cache order ${itemDescriptor}`,
          }
        : undefined,
  });

  return {
    orderId,
    paymentId: paymentIdDoc,
    total,
    burnDiscount: burnQuote.discount,
    tokensSpentBurned: burnQuote.amountTokens,
    rail: args.rail,
    x402:
      args.rail === "x402"
        ? {
            scheme: "exact",
            network: network.caip2,
            asset: network.asset,
            payTo,
            facilitatorUrl,
            resource: `/checkout/orders/${orderId}`,
            paymentId,
            price: `$${total.toFixed(2)}`,
            description: `.cache order ${itemDescriptor}`,
          }
        : null,
  };
}

async function listLiveStorefrontProducts(ctx: QueryCtx) {
  const products = await ctx.db
    .query("products")
    .withIndex("by_status", (q) => q.eq("status", "live"))
    .collect();
  return await Promise.all(
    products.map(async (product) => {
      const creator = await ctx.db.get(product.creatorId);
      const variants = await ctx.db
        .query("productVariants")
        .withIndex("by_product", (q) => q.eq("productId", product._id))
        .collect();
      return {
        ...product,
        creator,
        variants,
      };
    }),
  );
}

async function quoteBurnDiscount(
  ctx: MutationCtx,
  {
    productEligible,
    programId,
    amountTokens,
    subtotal,
  }: {
    productEligible: boolean;
    programId?: Id<"tokenPrograms">;
    amountTokens?: number;
    subtotal: number;
  },
) {
  if (!programId || !amountTokens || amountTokens <= 0) {
    return { discount: 0, amountTokens: 0, program: null };
  }
  if (!productEligible) {
    throw new Error("This product is not eligible for token burn discounts.");
  }
  const program = await ctx.db.get(programId);
  if (!program) throw new Error("Token burn program not found.");
  if (!program.active) throw new Error("Token burn program is not active.");
  const discount = Math.min(
    amountTokens * program.discountPerTokenUsd,
    program.maxDiscountUsd,
    subtotal,
  );
  return { discount, amountTokens, program };
}

export const markPayment = mutation({
  args: {
    paymentId: v.id("payments"),
    status: v.union(v.literal("confirmed"), v.literal("failed")),
    txHash: v.optional(v.string()),
  },
  handler: async (ctx, { paymentId, status, txHash }) => {
    await requireRole(ctx, ["admin", "finance", "support"]);
    const payment = await ctx.db.get(paymentId);
    if (!payment) throw new Error("Payment not found.");
    const wasConfirmed = payment.status === "confirmed";
    if (wasConfirmed && status === "failed") {
      throw new Error("Confirmed payments cannot be marked failed. Use a refund/cancel flow instead.");
    }
    await ctx.db.patch(paymentId, {
      status,
      txHash,
      confirmations: status === "confirmed" ? 1 : 0,
    });
    await ctx.db.patch(payment.orderId, {
      status: status === "confirmed" ? "paid" : "awaiting_payment",
    });
    if (status === "confirmed" && !wasConfirmed) {
      await syncCustomerOnPaidOrder(ctx, payment.orderId);
      await recordTreasuryInflow(ctx, paymentId, payment, txHash);
    }
    if (status === "failed") {
      await releaseInventoryReservationForOrder(ctx, payment.orderId);
      await markOrderBurnsFailed(ctx, payment.orderId);
    }
  },
});

export const cancelOrder = mutation({
  args: {
    orderId: v.id("orders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, reason }) => {
    await requireRole(ctx, ["admin", "finance", "support"]);
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found.");
    if (order.status !== "awaiting_payment") {
      throw new Error("Only awaiting_payment orders can be cancelled.");
    }

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    for (const payment of payments) {
      if (payment.status === "confirmed") {
        throw new Error("Confirmed payments cannot be cancelled. Refund them instead.");
      }
      if (payment.status !== "failed") {
        await ctx.db.patch(payment._id, {
          status: "failed",
          confirmations: 0,
        });
      }
    }

    await ctx.db.patch(orderId, {
      status: "cancelled",
    });
    await releaseInventoryReservationForOrder(ctx, orderId);
    await markOrderBurnsFailed(ctx, orderId);
    await addCustomerActivity(ctx, order.customerId, {
      type: "note",
      body: `Order ${order.number} cancelled.${reason?.trim() ? ` Reason: ${reason.trim()}` : ""}`,
    });
  },
});

export const refundOrder = mutation({
  args: {
    orderId: v.id("orders"),
    txHashOrRef: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { orderId, txHashOrRef, reason }) => {
    await requireRole(ctx, ["admin", "finance", "support"]);
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found.");
    if (!["paid", "processing", "partially_fulfilled", "fulfilled"].includes(order.status)) {
      throw new Error("Only paid or fulfilled orders can be refunded.");
    }

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    const confirmedPayments = payments.filter((payment) => payment.status === "confirmed");
    if (confirmedPayments.length === 0) {
      throw new Error("No confirmed payment found for this order.");
    }

    for (const payment of confirmedPayments) {
      await ctx.db.patch(payment._id, {
        status: "refunded",
        txHash: txHashOrRef ?? payment.txHash,
        confirmations: 0,
      });
      await recordTreasuryRefund(ctx, payment._id, payment, txHashOrRef);
    }

    await ctx.db.patch(orderId, {
      status: "refunded",
    });
    await releaseInventoryReservationForOrder(ctx, orderId);
    await markUnverifiedBurnsFailed(ctx, orderId);
    await reverseCustomerRevenueForRefund(ctx, order);
    await addCustomerActivity(ctx, order.customerId, {
      type: "note",
      body: `Order ${order.number} refunded.${reason?.trim() ? ` Reason: ${reason.trim()}` : ""}`,
    });
  },
});

async function findOrCreateCustomer(
  ctx: MutationCtx,
  emailRaw: string,
  nameRaw: string,
) {
  const email = emailRaw.trim().toLowerCase();
  const name = nameRaw.trim() || email;
  if (!email) throw new Error("Customer email is required.");
  const existing = (await ctx.db.query("customers").collect()).find(
    (customer) => customer.email?.toLowerCase() === email,
  );
  if (existing) return existing._id;
  return await ctx.db.insert("customers", {
    name,
    email,
    segments: ["checkout"],
    lifetimeValue: 0,
    orderCount: 0,
    marketingConsent: false,
    tokensBurnedLifetime: 0,
  });
}

async function nextOrderNumber(ctx: MutationCtx) {
  const count = (await ctx.db.query("orders").collect()).length + 1;
  return `CACHE-${String(count).padStart(5, "0")}`;
}

async function reserveInventoryIfNeeded(
  ctx: MutationCtx,
  variantId: Id<"productVariants">,
  quantity: number,
) {
  const inventory = await ctx.db
    .query("inventory")
    .withIndex("by_variant", (q) => q.eq("variantId", variantId))
    .first();
  if (!inventory) return;
  const available = inventory.onHand - inventory.reserved;
  if (available < quantity) {
    throw new Error(`Only ${Math.max(available, 0)} units available for this variant.`);
  }
  await ctx.db.patch(inventory._id, {
    reserved: inventory.reserved + quantity,
  });
}

async function releaseInventoryReservationForOrder(
  ctx: MutationCtx,
  orderId: Id<"orders">,
) {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .collect();
  for (const item of items) {
    if (!item.variantId) continue;
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_variant", (q) => q.eq("variantId", item.variantId!))
      .first();
    if (!inventory) continue;
    await ctx.db.patch(inventory._id, {
      reserved: Math.max(0, inventory.reserved - item.quantity),
    });
  }
}

async function createRoyaltyLedgerEntries(
  ctx: MutationCtx,
  {
    product,
    orderItemId,
    netRevenue,
  }: {
    product: Doc<"products">;
    orderItemId: Id<"orderItems">;
    netRevenue: number;
  },
) {
  const accruedAt = Date.now();
  for (const split of product.royaltySplits) {
    const amount = roundMoney((netRevenue * split.percent) / 100);
    await ctx.db.insert("royaltyLedger", {
      orderItemId,
      productId: product._id,
      payeeCreatorId: split.payeeCreatorId,
      role: split.role,
      percent: split.percent,
      basisAmount: netRevenue,
      amount,
      accruedAt,
    });
  }
}

async function syncCustomerOnPaidOrder(
  ctx: MutationCtx,
  orderId: Id<"orders">,
) {
  const order = await ctx.db.get(orderId);
  if (!order) return;
  const customer = await ctx.db.get(order.customerId);
  if (!customer) return;
  await ctx.db.patch(customer._id, {
    lifetimeValue: roundMoney(customer.lifetimeValue + order.total),
    orderCount: customer.orderCount + 1,
    lastOrderAt: order.placedAt,
  });
  await addCustomerActivity(ctx, customer._id, {
    type: "order",
    body: `Order ${order.number} paid via ${order.channel}.`,
  });
}

async function markOrderBurnsFailed(
  ctx: MutationCtx,
  orderId: Id<"orders">,
) {
  await markUnverifiedBurnsFailed(ctx, orderId);
}

async function markUnverifiedBurnsFailed(
  ctx: MutationCtx,
  orderId: Id<"orders">,
) {
  const burns = await ctx.db
    .query("tokenBurns")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .collect();
  for (const burn of burns) {
    if (burn.status === "verified") continue;
    await ctx.db.patch(burn._id, {
      status: "failed",
    });
  }
}

async function reverseCustomerRevenueForRefund(
  ctx: MutationCtx,
  order: Doc<"orders">,
) {
  const customer = await ctx.db.get(order.customerId);
  if (!customer) return;
  await ctx.db.patch(customer._id, {
    lifetimeValue: Math.max(0, roundMoney(customer.lifetimeValue - order.total)),
  });
}

async function recordTreasuryInflow(
  ctx: MutationCtx,
  paymentId: Id<"payments">,
  payment: Doc<"payments">,
  txHash?: string,
) {
  const amount = payment.amountUsdc ?? 0;
  const chain = payment.chain;
  if (!chain || amount <= 0) return;

  const existing = (await ctx.db.query("treasuryTransactions").collect()).find(
    (transaction) => transaction.ref === `payment:${paymentId}`,
  );
  if (existing) return;

  const account = (await ctx.db.query("treasuryAccounts").collect()).find(
    (item) => item.kind === "usdc_multisig" && item.chain === chain,
  );
  if (!account) return;

  await ctx.db.insert("treasuryTransactions", {
    accountId: account._id,
    type: "usdc_in",
    amount,
    currency: "USDC",
    chain,
    txHash,
    ref: `payment:${paymentId}`,
    status: "confirmed",
  });
  await ctx.db.patch(account._id, {
    balanceCache: roundMoney(account.balanceCache + amount),
  });
}

async function recordTreasuryRefund(
  ctx: MutationCtx,
  paymentId: Id<"payments">,
  payment: Doc<"payments">,
  txHashOrRef?: string,
) {
  const amount = payment.amountUsdc ?? 0;
  const chain = payment.chain;
  if (!chain || amount <= 0) return;

  const existing = (await ctx.db.query("treasuryTransactions").collect()).find(
    (transaction) => transaction.ref === `refund:${paymentId}`,
  );
  if (existing) return;

  const account = (await ctx.db.query("treasuryAccounts").collect()).find(
    (item) => item.kind === "usdc_multisig" && item.chain === chain,
  );
  if (!account) return;
  if (account.balanceCache < amount) {
    throw new Error("Refund exceeds cached treasury balance.");
  }

  await ctx.db.insert("treasuryTransactions", {
    accountId: account._id,
    type: "refund_out",
    amount,
    currency: "USDC",
    chain,
    txHash: txHashOrRef,
    ref: `refund:${paymentId}`,
    status: "confirmed",
  });
  await ctx.db.patch(account._id, {
    balanceCache: roundMoney(account.balanceCache - amount),
  });
}

async function addCustomerActivity(
  ctx: MutationCtx,
  customerId: Id<"customers">,
  activity: {
    type: "note" | "email" | "order" | "token_tier_change" | "ai_action";
    body: string;
  },
) {
  await ctx.db.insert("customerActivities", {
    customerId,
    type: activity.type,
    body: activity.body,
  });
}

async function receivingAddress(
  ctx: MutationCtx,
  chain: "evm" | "solana",
) {
  const account = (await ctx.db.query("treasuryAccounts").collect()).find(
    (item) => item.kind === "usdc_multisig" && item.chain === chain && item.address,
  );
  return account?.address ?? x402Networks[chain === "evm" ? "base" : "solana"].fallbackPayTo;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
