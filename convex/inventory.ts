import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, requireUser } from "./model/auth";

export const getByVariant = query({
  args: { variantId: v.id("productVariants") },
  handler: async (ctx, { variantId }) => {
    await requireUser(ctx);
    return await ctx.db
      .query("inventory")
      .withIndex("by_variant", (q) => q.eq("variantId", variantId))
      .first();
  },
});

export const upsert = mutation({
  args: {
    variantId: v.id("productVariants"),
    onHand: v.number(),
    reserved: v.optional(v.number()),
    reorderPoint: v.optional(v.number()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, { variantId, onHand, reserved, reorderPoint, location }) => {
    await requireRole(ctx, ["admin", "catalog_manager", "fulfillment"]);
    if (onHand < 0) throw new Error("onHand cannot be negative.");
    const existing = await ctx.db
      .query("inventory")
      .withIndex("by_variant", (q) => q.eq("variantId", variantId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        onHand,
        reserved: reserved ?? existing.reserved,
        reorderPoint: reorderPoint ?? existing.reorderPoint,
        location: location ?? existing.location,
      });
      return existing._id;
    }
    return await ctx.db.insert("inventory", {
      variantId,
      onHand,
      reserved: reserved ?? 0,
      reorderPoint: reorderPoint ?? 0,
      location,
    });
  },
});
