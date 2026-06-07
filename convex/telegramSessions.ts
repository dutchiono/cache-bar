import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const cartItem = v.object({ sku: v.string(), qty: v.number() });
const botRole = v.union(v.literal("store"), v.literal("manager"));

export const getSession = internalQuery({
  args: { bot: botRole, chatId: v.number() },
  handler: async (ctx, { bot, chatId }) => {
    const scoped = await ctx.db
      .query("telegramSessions")
      .withIndex("by_bot_chat", (q) => q.eq("bot", bot).eq("chatId", chatId))
      .unique();
    if (scoped) return scoped;
    if (bot === "store") {
      return await ctx.db
        .query("telegramSessions")
        .withIndex("by_chat", (q) => q.eq("chatId", chatId))
        .unique();
    }
    return null;
  },
});

export const upsertSession = internalMutation({
  args: {
    bot: botRole,
    chatId: v.number(),
    mode: v.optional(v.union(v.literal("menu"), v.literal("chat"))),
    cart: v.optional(v.array(cartItem)),
  },
  handler: async (ctx, { bot, chatId, mode, cart }) => {
    let existing = await ctx.db
      .query("telegramSessions")
      .withIndex("by_bot_chat", (q) => q.eq("bot", bot).eq("chatId", chatId))
      .unique();
    if (!existing && bot === "store") {
      existing = await ctx.db
        .query("telegramSessions")
        .withIndex("by_chat", (q) => q.eq("chatId", chatId))
        .unique();
    }
    const patch = {
      bot,
      ...(mode !== undefined ? { mode } : {}),
      ...(cart !== undefined ? { cart } : {}),
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("telegramSessions", {
      bot,
      chatId,
      mode: mode ?? "menu",
      cart: cart ?? [],
      updatedAt: Date.now(),
    });
  },
});

export const opsSnapshot = internalQuery({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query("orders").collect();
    const submissions = await ctx.db.query("submissions").collect();
    const variant = await ctx.db
      .query("productVariants")
      .withIndex("by_sku", (q) => q.eq("sku", "STICKER-PACK-001"))
      .unique();
    const inventory = variant
      ? await ctx.db
          .query("inventory")
          .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
          .unique()
      : null;

    const activeOrders = orders.filter((o) =>
      ["awaiting_payment", "paid", "processing", "partially_fulfilled"].includes(o.status),
    ).length;
    const newSubmissions = submissions.filter((s) => s.status === "new" || s.status === "prescreened")
      .length;

    return {
      totalOrders: orders.length,
      activeOrders,
      newSubmissions,
      stickerOnHand: inventory?.onHand ?? null,
      stickerReserved: inventory?.reserved ?? null,
    };
  },
});
