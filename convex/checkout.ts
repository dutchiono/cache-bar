import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { requireRole, requireUser } from "./model/auth";

const paymentRail = v.union(v.literal("usdc"), v.literal("x402"));
const paymentNetwork = v.union(v.literal("base"), v.literal("solana"));

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
    await requireUser(ctx);
    return await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .collect();
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
  args: {
    productId: v.id("products"),
    quantity: v.number(),
    customerName: v.string(),
    customerEmail: v.string(),
    rail: paymentRail,
    network: paymentNetwork,
    fromAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    if (!Number.isInteger(args.quantity) || args.quantity < 1) {
      throw new Error("Quantity must be at least 1.");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found.");
    if (product.status !== "live") {
      throw new Error("Only live products can be checked out.");
    }

    const customer = await findOrCreateCustomer(ctx, args.customerEmail, args.customerName);
    const subtotal = product.basePrice * args.quantity;
    const orderId = await ctx.db.insert("orders", {
      number: await nextOrderNumber(ctx),
      customerId: customer,
      channel: args.rail === "x402" ? "x402_checkout" : "usdc_checkout",
      status: "awaiting_payment",
      subtotal,
      holdTierDiscount: 0,
      burnDiscount: 0,
      tokensSpentBurned: 0,
      tax: 0,
      shipping: product.productType === "physical" ? 9 : 0,
      total: subtotal + (product.productType === "physical" ? 9 : 0),
      currency: "USD",
      placedAt: Date.now(),
    });

    await ctx.db.insert("orderItems", {
      orderId,
      productId: product._id,
      makerType: product.makerType,
      quantity: args.quantity,
      unitPrice: product.basePrice,
      netRevenue: subtotal,
      fulfillmentKind:
        product.productType === "digital" ? "digital_delivery" : "print_on_demand",
    });

    const network = x402Networks[args.network];
    const payTo = await receivingAddress(ctx, network.chain);
    const paymentId = `pay_${orderId}_${Date.now()}`;
    const total = subtotal + (product.productType === "physical" ? 9 : 0);

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
              description: `.cache order ${product.title}`,
            }
          : undefined,
    });

    return {
      orderId,
      paymentId: paymentIdDoc,
      total,
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
              description: `.cache order ${product.title}`,
            }
          : null,
    };
  },
});

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
    await ctx.db.patch(paymentId, {
      status,
      txHash,
      confirmations: status === "confirmed" ? 1 : payment.confirmations,
    });
    await ctx.db.patch(payment.orderId, {
      status: status === "confirmed" ? "paid" : "awaiting_payment",
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

async function receivingAddress(
  ctx: MutationCtx,
  chain: "evm" | "solana",
) {
  const account = (await ctx.db.query("treasuryAccounts").collect()).find(
    (item) => item.kind === "usdc_multisig" && item.chain === chain && item.address,
  );
  return account?.address ?? x402Networks[chain === "evm" ? "base" : "solana"].fallbackPayTo;
}
