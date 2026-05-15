import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, requireUser } from "./model/auth";

export const listByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    await requireUser(ctx);
    return await ctx.db
      .query("digitalAssets")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();
  },
});

export const generateUploadUrl = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    await requireRole(ctx, ["admin", "catalog_manager"]);
    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Product not found.");
    if (product.productType !== "digital") {
      throw new Error("Digital assets are only for digital products.");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    productId: v.id("products"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "catalog_manager"]);
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found.");
    if (product.productType !== "digital") {
      throw new Error("Digital assets are only for digital products.");
    }
    return await ctx.db.insert("digitalAssets", args);
  },
});

export const remove = mutation({
  args: { id: v.id("digitalAssets") },
  handler: async (ctx, { id }) => {
    await requireRole(ctx, ["admin", "catalog_manager"]);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Digital asset not found.");
    await ctx.storage.delete(existing.storageId);
    await ctx.db.delete(id);
  },
});
