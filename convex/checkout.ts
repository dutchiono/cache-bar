import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
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
  shippingAddress: v.optional(
    v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      region: v.string(),
      postalCode: v.string(),
      country: v.string(),
    }),
  ),
  rail: paymentRail,
  network: paymentNetwork,
  fromAddress: v.optional(v.string()),
  tokenProgramId: v.optional(v.id("tokenPrograms")),
  burnAmountTokens: v.optional(v.number()),
  burnWalletAddress: v.optional(v.string()),
};

const shippingAddressArg = v.object({
  line1: v.string(),
  line2: v.optional(v.string()),
  city: v.string(),
  region: v.string(),
  postalCode: v.string(),
  country: v.string(),
});

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

export const orderDetail = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    await requireRole(ctx, ["admin", "finance", "support", "readonly"]);
    const order = await ctx.db.get(orderId);
    if (!order) return null;
    const customer = await ctx.db.get(order.customerId);
    const stashRedemption = order.stashRedemptionId ? await ctx.db.get(order.stashRedemptionId) : null;
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    const tokenBurns = await ctx.db
      .query("tokenBurns")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    const fulfillments = await ctx.db
      .query("fulfillments")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", orderId))
      .collect();

    return {
      ...order,
      customer,
      stashRedemption,
      payments,
      tokenBurns,
      items: await Promise.all(
        items.map(async (item) => ({
          ...item,
          product: await ctx.db.get(item.productId),
          variant: item.variantId ? await ctx.db.get(item.variantId) : null,
          fulfillments: fulfillments.filter((fulfillment) => fulfillment.orderItemId === item._id),
        })),
      ),
    };
  },
});

export const stripeRefundContext = query({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, { paymentId }) => {
    await requireRole(ctx, ["admin", "finance", "support"]);
    const payment = await ctx.db.get(paymentId);
    if (!payment) throw new Error("Payment not found.");
    if (payment.rail !== "stripe") {
      throw new Error("Only Stripe-backed payments can be refunded here.");
    }
    if (!payment.stripePaymentIntentId) {
      throw new Error("Stripe payment intent is missing for this payment.");
    }
    const order = await ctx.db.get(payment.orderId);
    if (!order) throw new Error("Order not found.");

    return {
      paymentId: payment._id,
      orderId: order._id,
      orderNumber: order.number,
      paymentStatus: payment.status,
      orderStatus: order.status,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      amountUsd: order.total,
      customerEmail: order.customerId ? (await ctx.db.get(order.customerId))?.email ?? null : null,
    };
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

export const checkoutSelectionContext = internalQuery({
  args: {
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
  },
  handler: async (ctx, { productId, variantId }) => {
    const product = await ctx.db.get(productId);
    if (!product) return null;

    let variant = null;
    if (variantId) {
      variant = await ctx.db.get(variantId);
      if (!variant || variant.productId !== productId) {
        return null;
      }
    }

    const tokenProgram = await resolveProductTokenProgram(ctx, product);

    return {
      product,
      variant,
      tokenProgram,
    };
  },
});

export const createStripeCheckoutDraft = internalMutation({
  args: {
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(),
    customerName: v.string(),
    customerEmail: v.string(),
    shippingAddress: v.optional(shippingAddressArg),
    stashRedemptionId: v.optional(v.id("stashRedemptions")),
    discountValueUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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
    const discountValueUsd = roundMoney(
      Math.min(Math.max(args.discountValueUsd ?? 0, 0), subtotal),
    );
    const shippingAddress =
      product.productType === "physical"
        ? (args.shippingAddress ? normalizeShippingAddress(args.shippingAddress) : undefined)
        : undefined;
    const fulfillmentKind =
      product.productType === "digital" ? "digital_delivery" : "print_on_demand";

    if (variant) {
      await reserveInventoryIfNeeded(ctx, variant._id, args.quantity);
    }

    const orderId = await ctx.db.insert("orders", {
      number: await nextOrderNumber(ctx),
      customerId: customer,
      channel: "stripe_checkout",
      status: "awaiting_payment",
      subtotal,
      holdTierDiscount: 0,
      burnDiscount: discountValueUsd,
      tokensSpentBurned: 0,
      tax: 0,
      shipping,
      shippingAddress,
      stashRedemptionId: args.stashRedemptionId,
      total: subtotal - discountValueUsd + shipping,
      currency: "USD",
      placedAt: Date.now(),
    });

    const netRevenue = subtotal - discountValueUsd;
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

    const paymentId = await ctx.db.insert("payments", {
      orderId,
      rail: "stripe",
      status: "pending",
    });

    return {
      orderId,
      paymentId,
      orderNumber: (await ctx.db.get(orderId))?.number ?? "",
      productTitle: product.title,
      variantLabel: variant?.optionLabel,
      subtotal,
      shipping,
      discountValueUsd,
      total: subtotal - discountValueUsd + shipping,
      stashRedemptionId: args.stashRedemptionId,
    };
  },
});

export const markStripeCheckoutSessionCreated = internalMutation({
  args: {
    paymentId: v.id("payments"),
    stripeCheckoutSessionId: v.string(),
  },
  handler: async (ctx, { paymentId, stripeCheckoutSessionId }) => {
    await ctx.db.patch(paymentId, {
      stripeCheckoutSessionId,
    });
  },
});

export const stripePaymentByIntent = internalQuery({
  args: {
    stripePaymentIntentId: v.string(),
  },
  handler: async (ctx, { stripePaymentIntentId }) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_stripe_payment_intent", (q) => q.eq("stripePaymentIntentId", stripePaymentIntentId))
      .first();
  },
});

export const confirmStripeCheckoutPayment = internalMutation({
  args: {
    paymentId: v.id("payments"),
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    stripePaymentMethodType: v.optional(v.string()),
    shippingAddress: v.optional(shippingAddressArg),
  },
  handler: async (
    ctx,
    { paymentId, stripeCheckoutSessionId, stripePaymentIntentId, stripePaymentMethodType, shippingAddress },
  ) => {
    const payment = await ctx.db.get(paymentId);
    if (!payment) throw new Error("Payment not found.");
    const wasConfirmed = payment.status === "confirmed";
    await ctx.db.patch(paymentId, {
      status: "confirmed",
      stripeCheckoutSessionId,
      stripePaymentIntentId,
      stripePaymentMethodType,
    });
    const order = await ctx.db.get(payment.orderId);
    if (!order) throw new Error("Order not found.");
    await ctx.db.patch(payment.orderId, {
      status: "paid",
      shippingAddress: shippingAddress ?? order.shippingAddress,
    });
    if (!wasConfirmed) {
      await ensureRoyaltyLedgerEntriesForOrder(ctx, payment.orderId);
      await syncCustomerOnPaidOrder(ctx, payment.orderId);
      await markStashRedemptionRedeemed(ctx, payment.orderId);
    }
  },
});

export const failStripeCheckoutPayment = internalMutation({
  args: {
    paymentId: v.id("payments"),
    stripeCheckoutSessionId: v.optional(v.string()),
  },
  handler: async (ctx, { paymentId, stripeCheckoutSessionId }) => {
    const payment = await ctx.db.get(paymentId);
    if (!payment) throw new Error("Payment not found.");
    if (payment.status === "confirmed") {
      throw new Error("Confirmed payments cannot be failed.");
    }
    await ctx.db.patch(paymentId, {
      status: "failed",
      stripeCheckoutSessionId: stripeCheckoutSessionId ?? payment.stripeCheckoutSessionId,
    });
    await ctx.db.patch(payment.orderId, { status: "awaiting_payment" });
    await releaseInventoryReservationForOrder(ctx, payment.orderId);
    await failOpenFulfillments(ctx, payment.orderId);
  },
});

export const syncStripePaymentFailureFromWebhook = internalMutation({
  args: {
    paymentId: v.id("payments"),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, { paymentId, stripePaymentIntentId }) => {
    const payment = await ctx.db.get(paymentId);
    if (!payment) throw new Error("Payment not found.");
    if (payment.status === "confirmed" || payment.status === "refunded") {
      return;
    }

    await ctx.db.patch(paymentId, {
      status: "failed",
      stripePaymentIntentId: stripePaymentIntentId ?? payment.stripePaymentIntentId,
    });
    await ctx.db.patch(payment.orderId, {
      status: "awaiting_payment",
    });
    await releaseInventoryReservationForOrder(ctx, payment.orderId);
    await failOpenFulfillments(ctx, payment.orderId);
  },
});

export const syncStripeRefundFromWebhook = internalMutation({
  args: {
    paymentId: v.id("payments"),
    stripePaymentIntentId: v.optional(v.string()),
    stripeRefundId: v.string(),
    refundAmountUsd: v.number(),
  },
  handler: async (ctx, { paymentId, stripePaymentIntentId, stripeRefundId, refundAmountUsd }) => {
    const payment = await ctx.db.get(paymentId);
    if (!payment) throw new Error("Payment not found.");
    const order = await ctx.db.get(payment.orderId);
    if (!order) throw new Error("Order not found.");

    const normalizedRefundAmount = roundMoney(Math.max(refundAmountUsd, 0));
    const fullRefund = normalizedRefundAmount >= roundMoney(order.total);
    await ctx.db.patch(paymentId, {
      stripePaymentIntentId: stripePaymentIntentId ?? payment.stripePaymentIntentId,
      stripeRefundId,
      stripeRefundAmountUsd: normalizedRefundAmount,
      status: fullRefund ? "refunded" : payment.status,
    });

    if (!fullRefund) {
      await addCustomerActivity(ctx, order.customerId, {
        type: "note",
        body: `Stripe partial refund recorded for order ${order.number}: ${normalizedRefundAmount.toFixed(2)} USD.`,
      });
      return;
    }

    const alreadyRefunded = order.status === "refunded";
    await ctx.db.patch(order._id, {
      status: "refunded",
    });
    await releaseInventoryReservationForOrder(ctx, order._id);
    await markUnverifiedBurnsFailed(ctx, order._id);
    await failOpenFulfillments(ctx, order._id);
    await createRefundRoyaltyReversals(ctx, order._id);
    if (!alreadyRefunded) {
      await reverseCustomerRevenueByAmount(ctx, order.customerId, order.total);
      await addCustomerActivity(ctx, order.customerId, {
        type: "note",
        body: `Stripe refund completed for order ${order.number}.`,
      });
    }
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
    shippingAddress?: {
      line1: string;
      line2?: string;
      city: string;
      region: string;
      postalCode: string;
      country: string;
    };
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
  const shippingAddress =
    product.productType === "physical"
      ? normalizeShippingAddress(args.shippingAddress)
      : undefined;
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
    shippingAddress,
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
    instruction: {
      network: network.caip2,
      asset: network.asset,
      payTo,
      amount: `$${total.toFixed(2)}`,
    },
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
      const tokenProgram = await resolveProductTokenProgram(ctx, product);
      const variants = await ctx.db
        .query("productVariants")
        .withIndex("by_product", (q) => q.eq("productId", product._id))
        .collect();
      return {
        ...product,
        creator,
        tokenProgram,
        variants,
      };
    }),
  );
}

async function resolveProductTokenProgram(
  ctx: Pick<QueryCtx, "db">,
  product: Doc<"products">,
) {
  if (product.tokenProgramId) {
    return await ctx.db.get(product.tokenProgramId);
  }
  if (!product.tokenDiscountEligible) {
    return null;
  }
  const programs = await ctx.db
    .query("tokenPrograms")
    .withIndex("by_active", (q) => q.eq("active", true))
    .collect();
  const redeemablePrograms = programs.filter((program) => program.redemptionEnabled ?? true);
  return redeemablePrograms.length === 1 ? redeemablePrograms[0] : null;
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
      await ensureRoyaltyLedgerEntriesForOrder(ctx, payment.orderId);
      await syncCustomerOnPaidOrder(ctx, payment.orderId);
      await recordTreasuryInflow(ctx, paymentId, payment, txHash);
    }
    if (status === "failed") {
      await releaseInventoryReservationForOrder(ctx, payment.orderId);
      await markOrderBurnsFailed(ctx, payment.orderId);
      await failOpenFulfillments(ctx, payment.orderId);
    }
  },
});

export const paymentVerificationContext = internalQuery({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, { paymentId }) => {
    const payment = await ctx.db.get(paymentId);
    if (!payment) return null;
    const order = await ctx.db.get(payment.orderId);
    if (!order) return null;
    const payTo =
      payment.x402?.payTo ?? (await receivingAddressForReader(ctx, payment.chain ?? "evm"));
    return {
      ...payment,
      orderNumber: order.number,
      currency: order.currency,
      payTo,
    };
  },
});

export const pendingPaymentSubmissions = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db.query("payments").collect();
    return rows
      .filter((payment) => payment.status === "pending" && Boolean(payment.txHash?.trim()))
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, Math.max(1, Math.min(limit ?? 25, 100)))
      .map((payment) => ({
        paymentId: payment._id,
        txHash: payment.txHash!,
      }));
  },
});

export const recordPaymentSubmission = internalMutation({
  args: {
    paymentId: v.id("payments"),
    txHash: v.string(),
    fromAddress: v.optional(v.string()),
    confirmations: v.optional(v.number()),
  },
  handler: async (ctx, { paymentId, txHash, fromAddress, confirmations }) => {
    const payment = await ctx.db.get(paymentId);
    if (!payment) throw new Error("Payment not found.");
    await ctx.db.patch(paymentId, {
      txHash,
      fromAddress: fromAddress ?? payment.fromAddress,
      confirmations: confirmations ?? payment.confirmations,
    });
    if (payment.status === "pending" && txHash.trim()) {
      await ctx.scheduler.runAfter(2 * 60 * 1000, internal.payments.reconcileSubmittedPayment, {
        paymentId,
      });
    }
  },
});

export const confirmVerifiedPayment = internalMutation({
  args: {
    paymentId: v.id("payments"),
    txHash: v.string(),
    fromAddress: v.optional(v.string()),
    confirmations: v.optional(v.number()),
  },
  handler: async (ctx, { paymentId, txHash, fromAddress, confirmations }) => {
    const payment = await ctx.db.get(paymentId);
    if (!payment) throw new Error("Payment not found.");
    const wasConfirmed = payment.status === "confirmed";
    await ctx.db.patch(paymentId, {
      status: "confirmed",
      txHash,
      fromAddress: fromAddress ?? payment.fromAddress,
      confirmations: confirmations ?? 1,
    });
    await ctx.db.patch(payment.orderId, {
      status: "paid",
    });
    if (!wasConfirmed) {
      const patched = await ctx.db.get(paymentId);
      if (!patched) return;
      await ensureRoyaltyLedgerEntriesForOrder(ctx, payment.orderId);
      await syncCustomerOnPaidOrder(ctx, payment.orderId);
      await recordTreasuryInflow(ctx, paymentId, patched, txHash);
    }
  },
});

export const failVerifiedPayment = internalMutation({
  args: {
    paymentId: v.id("payments"),
    txHash: v.optional(v.string()),
  },
  handler: async (ctx, { paymentId, txHash }) => {
    const payment = await ctx.db.get(paymentId);
    if (!payment) throw new Error("Payment not found.");
    if (payment.status === "confirmed") {
      throw new Error("Confirmed payments cannot be marked failed.");
    }
    await ctx.db.patch(paymentId, {
      status: "failed",
      txHash: txHash ?? payment.txHash,
      confirmations: 0,
    });
    await ctx.db.patch(payment.orderId, {
      status: "awaiting_payment",
    });
    await releaseInventoryReservationForOrder(ctx, payment.orderId);
    await markOrderBurnsFailed(ctx, payment.orderId);
    await failOpenFulfillments(ctx, payment.orderId);
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
    await failOpenFulfillments(ctx, orderId);
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
    await failOpenFulfillments(ctx, orderId);
    await createRefundRoyaltyReversals(ctx, orderId);
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

async function ensureRoyaltyLedgerEntriesForOrder(
  ctx: MutationCtx,
  orderId: Id<"orders">,
) {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .collect();

  for (const item of items) {
    const existing = await ctx.db
      .query("royaltyLedger")
      .withIndex("by_orderItem", (q) => q.eq("orderItemId", item._id))
      .collect();
    if (existing.some((entry) => entry.amount >= 0)) continue;

    const product = await ctx.db.get(item.productId);
    if (!product) continue;
    await createRoyaltyLedgerEntries(ctx, {
      product,
      orderItemId: item._id,
      netRevenue: item.netRevenue,
    });
  }
}

async function createRefundRoyaltyReversals(
  ctx: MutationCtx,
  orderId: Id<"orders">,
) {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .collect();
  for (const item of items) {
    const entries = await ctx.db
      .query("royaltyLedger")
      .withIndex("by_orderItem", (q) => q.eq("orderItemId", item._id))
      .collect();
    const positiveEntries = entries.filter((entry) => entry.amount > 0);
    const hasRefundReversal = entries.some((entry) => entry.amount < 0);
    if (positiveEntries.length === 0 || hasRefundReversal) continue;

    for (const entry of positiveEntries) {
      await ctx.db.insert("royaltyLedger", {
        orderItemId: entry.orderItemId,
        productId: entry.productId,
        payeeCreatorId: entry.payeeCreatorId,
        role: `${entry.role} refund`,
        percent: entry.percent,
        basisAmount: -entry.basisAmount,
        amount: -entry.amount,
        accruedAt: Date.now(),
        payoutId: entry.payoutId,
      });
    }
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

async function markStashRedemptionRedeemed(
  ctx: MutationCtx,
  orderId: Id<"orders">,
) {
  const order = await ctx.db.get(orderId);
  if (!order?.stashRedemptionId) return;
  const redemption = await ctx.db.get(order.stashRedemptionId);
  if (!redemption || redemption.status === "redeemed") return;
  await ctx.db.patch(order.stashRedemptionId, {
    status: "redeemed",
    redeemedAt: Date.now(),
  });
}

async function reverseCustomerRevenueForRefund(
  ctx: MutationCtx,
  order: Doc<"orders">,
) {
  await reverseCustomerRevenueByAmount(ctx, order.customerId, order.total);
}

async function reverseCustomerRevenueByAmount(
  ctx: MutationCtx,
  customerId: Id<"customers">,
  amount: number,
) {
  const customer = await ctx.db.get(customerId);
  if (!customer) return;
  await ctx.db.patch(customer._id, {
    lifetimeValue: Math.max(0, roundMoney(customer.lifetimeValue - amount)),
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

async function failOpenFulfillments(
  ctx: MutationCtx,
  orderId: Id<"orders">,
) {
  const fulfillments = await ctx.db
    .query("fulfillments")
    .withIndex("by_order", (q) => q.eq("orderId", orderId))
    .collect();
  for (const fulfillment of fulfillments) {
    if (fulfillment.status === "delivered" || fulfillment.status === "failed") continue;
    await ctx.db.patch(fulfillment._id, {
      status: "failed",
    });
  }
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
  return await receivingAddressForReader(ctx, chain);
}

async function receivingAddressForReader(
  ctx: Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">,
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

function normalizeShippingAddress(
  shippingAddress:
    | {
        line1: string;
        line2?: string;
        city: string;
        region: string;
        postalCode: string;
        country: string;
      }
    | undefined,
) {
  if (!shippingAddress) {
    throw new Error("Shipping address is required for physical products.");
  }

  const normalized = {
    line1: shippingAddress.line1.trim(),
    line2: shippingAddress.line2?.trim() || undefined,
    city: shippingAddress.city.trim(),
    region: shippingAddress.region.trim(),
    postalCode: shippingAddress.postalCode.trim(),
    country: shippingAddress.country.trim(),
  };

  if (!normalized.line1 || !normalized.city || !normalized.region || !normalized.postalCode || !normalized.country) {
    throw new Error("Shipping address is incomplete.");
  }

  return normalized;
}
