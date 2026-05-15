import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, requireUser } from "./model/auth";

export const listByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    await requireUser(ctx);
    return await ctx.db
      .query("productVariants")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();
  },
});

export const create = mutation({
  args: {
    productId: v.id("products"),
    sku: v.string(),
    optionLabel: v.string(),
    priceOverride: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "catalog_manager"]);
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found.");
    if (product.productType !== "physical") {
      throw new Error("Variants are only for physical products.");
    }
    const dup = await ctx.db
      .query("productVariants")
      .withIndex("by_sku", (q) => q.eq("sku", args.sku))
      .first();
    if (dup) throw new Error(`SKU "${args.sku}" already exists.`);
    return await ctx.db.insert("productVariants", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("productVariants"),
    optionLabel: v.optional(v.string()),
    priceOverride: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireRole(ctx, ["admin", "catalog_manager"]);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Variant not found.");
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("productVariants") },
  handler: async (ctx, { id }) => {
    await requireRole(ctx, ["admin", "catalog_manager"]);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Variant not found.");
    const inv = await ctx.db
      .query("inventory")
      .withIndex("by_variant", (q) => q.eq("variantId", id))
      .first();
    if (inv) await ctx.db.delete(inv._id);
    await ctx.db.delete(id);
  },
});
