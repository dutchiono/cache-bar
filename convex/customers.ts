import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./model/auth";

const staffReadRoles = [
  "admin",
  "catalog_manager",
  "fulfillment",
  "finance",
  "support",
  "readonly",
] as const;

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [...staffReadRoles]);
    const customers = await ctx.db.query("customers").collect();
    return await Promise.all(
      customers
        .sort((a, b) => (b.lastOrderAt ?? 0) - (a.lastOrderAt ?? 0))
        .map(async (customer) => {
          const wallets = await ctx.db
            .query("wallets")
            .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
            .collect();
          const latestActivity = (
            await ctx.db
              .query("customerActivities")
              .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
              .collect()
          )
            .sort((a, b) => b._creationTime - a._creationTime)
            .at(0) ?? null;
          return {
            ...customer,
            wallets,
            latestActivity,
          };
        }),
    );
  },
});

export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    await requireRole(ctx, [...staffReadRoles]);
    const customer = await ctx.db.get(id);
    if (!customer) return null;
    const wallets = await ctx.db
      .query("wallets")
      .withIndex("by_customer", (q) => q.eq("customerId", id))
      .collect();
    const activities = (
      await ctx.db
        .query("customerActivities")
        .withIndex("by_customer", (q) => q.eq("customerId", id))
        .collect()
    ).sort((a, b) => b._creationTime - a._creationTime);
    const orders = (
      await ctx.db
        .query("orders")
        .withIndex("by_customer", (q) => q.eq("customerId", id))
        .collect()
    ).sort((a, b) => b.placedAt - a.placedAt);
    return { customer, wallets, activities, orders };
  },
});

export const attachWallet = mutation({
  args: {
    customerId: v.id("customers"),
    chain: v.union(v.literal("evm"), v.literal("solana")),
    address: v.string(),
    verified: v.optional(v.boolean()),
  },
  handler: async (ctx, { customerId, chain, address, verified }) => {
    await requireRole(ctx, ["admin", "support", "finance"]);
    const customer = await ctx.db.get(customerId);
    if (!customer) throw new Error("Customer not found.");
    const normalized = address.trim();
    if (!normalized) throw new Error("Wallet address is required.");
    const existing = await ctx.db
      .query("wallets")
      .withIndex("by_address", (q) => q.eq("address", normalized))
      .first();
    if (existing && existing.customerId !== customerId) {
      throw new Error("Wallet is already assigned to another customer.");
    }
    if (existing) {
      await ctx.db.patch(existing._id, {
        verifiedAt: verified ? Date.now() : existing.verifiedAt,
      });
      return existing._id;
    }
    return await ctx.db.insert("wallets", {
      customerId,
      chain,
      address: normalized,
      verifiedAt: verified ? Date.now() : undefined,
    });
  },
});

export const addActivity = mutation({
  args: {
    customerId: v.id("customers"),
    type: v.union(
      v.literal("note"),
      v.literal("email"),
      v.literal("token_tier_change"),
      v.literal("ai_action"),
    ),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["admin", "support", "finance"]);
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new Error("Customer not found.");
    if (!args.body.trim()) throw new Error("Activity body is required.");
    return await ctx.db.insert("customerActivities", {
      customerId: args.customerId,
      type: args.type,
      body: args.body.trim(),
      authorId: user._id,
    });
  },
});
