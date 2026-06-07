import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { elizaCloudChat } from "./lib/elizaCloudChat";
import { LIVE_SHOP_PRODUCTS, liveProduct, shopUrl } from "./lib/liveShopCatalog";
import {
  answerCallbackQuery,
  type InlineKeyboard,
  sendTelegramMessage,
  setTelegramWebhook,
  convexTelegramWebhookUrl,
} from "./lib/telegramApi";

type CartLine = { sku: string; qty: number };

const cartItem = v.object({ sku: v.string(), qty: v.number() });

export const getSession = internalQuery({
  args: { chatId: v.number() },
  handler: async (ctx, { chatId }) => {
    return await ctx.db
      .query("telegramSessions")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .unique();
  },
});

export const upsertSession = internalMutation({
  args: {
    chatId: v.number(),
    mode: v.optional(v.union(v.literal("menu"), v.literal("chat"))),
    cart: v.optional(v.array(cartItem)),
  },
  handler: async (ctx, { chatId, mode, cart }) => {
    const existing = await ctx.db
      .query("telegramSessions")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .unique();
    const patch = {
      ...(mode !== undefined ? { mode } : {}),
      ...(cart !== undefined ? { cart } : {}),
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("telegramSessions", {
      chatId,
      mode: mode ?? "menu",
      cart: cart ?? [],
      updatedAt: Date.now(),
    });
  },
});

export const registerWebhook = internalAction({
  args: {},
  handler: async () => {
    const url = convexTelegramWebhookUrl();
    await setTelegramWebhook(url);
    return { ok: true, webhookUrl: url };
  },
});

export const processUpdate = internalAction({
  args: { update: v.any() },
  handler: async (ctx, { update }) => {
    if (update?.callback_query) {
      await handleCallback(ctx, update.callback_query);
      return;
    }
    if (update?.message) {
      await handleMessage(ctx, update.message);
    }
  },
});

async function handleCallback(ctx: ActionCtx, callback: {
    id: string;
    data?: string;
    message?: { chat: { id: number } };
  },
) {
  const chatId = callback.message?.chat?.id;
  if (!chatId || !callback.data) return;

  await answerCallbackQuery(callback.id);

  const data = callback.data;
  if (data === "menu") {
    await ctx.runMutation(internal.telegramBot.upsertSession, { chatId, mode: "menu" });
    await sendMainMenu(chatId, "Main menu");
    return;
  }
  if (data === "shop") {
    await sendShopMenu(chatId);
    return;
  }
  if (data === "chat") {
    await ctx.runMutation(internal.telegramBot.upsertSession, { chatId, mode: "chat" });
    await sendTelegramMessage(
      chatId,
      "Ask me anything — I'll answer here. Shop and cart buttons stay below whenever you want them.",
      menuKeyboard(),
    );
    return;
  }
  if (data === "cart") {
    await sendCart(ctx, chatId);
    return;
  }
  if (data === "clear") {
    await ctx.runMutation(internal.telegramBot.upsertSession, { chatId, cart: [] });
    await sendTelegramMessage(chatId, "Cart cleared.", menuKeyboard());
    return;
  }
  if (data.startsWith("p:")) {
    const sku = `CST-${data.slice(2)}`;
    await sendProduct(chatId, sku);
    return;
  }
  if (data.startsWith("a:")) {
    const sku = `CST-${data.slice(2)}`;
    await addToCart(ctx, chatId, sku);
    return;
  }
}

async function handleMessage(ctx: ActionCtx, message: {
    chat: { id: number };
    text?: string;
  },
) {
  const chatId = message.chat.id;
  const text = (message.text ?? "").trim();
  if (!text) return;

  const lower = text.toLowerCase();
  if (lower === "/start" || lower === "/menu" || lower === "menu") {
    await ctx.runMutation(internal.telegramBot.upsertSession, { chatId, mode: "menu" });
    await sendMainMenu(chatId, welcomeText());
    return;
  }
  if (lower === "/shop" || lower === "shop") {
    await sendShopMenu(chatId);
    return;
  }
  if (lower === "/cart" || lower === "cart") {
    await sendCart(ctx, chatId);
    return;
  }
  if (lower === "/chat" || lower === "chat") {
    await ctx.runMutation(internal.telegramBot.upsertSession, { chatId, mode: "chat" });
    await sendTelegramMessage(
      chatId,
      "Ask me anything — I'll answer here. Shop and cart buttons stay below whenever you want them.",
      menuKeyboard(),
    );
    return;
  }
  if (lower === "/website" || lower === "website") {
    await sendTelegramMessage(
      chatId,
      `Full storefront: ${shopUrl()}`,
      inlineKeyboard([[{ text: "Open dotcache shop", url: shopUrl() }], menuRow()]),
    );
    return;
  }

  // Default: conversational reply + contextual buttons (hybrid, not either/or).
  await sendConversationalReply(chatId, text);
}

async function sendConversationalReply(chatId: number, text: string) {
  const reply = await elizaCloudChat(text);
  const keyboard = looksLikeShopQuery(text) ? shopContextKeyboard() : menuKeyboard();
  await sendTelegramMessage(chatId, reply, keyboard);
}

function looksLikeShopQuery(text: string) {
  const lower = text.toLowerCase();
  return (
    /\b(shop|store|catalog|catalogue|drop|sticker|stickers|sku|inventory|buy|price|cost)\b/.test(lower) ||
    /\bwhat('s|s| is) in\b/.test(lower) ||
    /\bwhast in\b/.test(lower) ||
    /\bcst-\d{3}\b/.test(lower)
  );
}

function welcomeText() {
  return [
    "<b>.cache · dotCache</b>",
    "",
    "Talk to me, tap buttons, or both — whatever you're comfortable with.",
    "• Type a question about the drop",
    "• Tap <b>Shop</b> for the sticker catalog",
    "• Tap <b>Website</b> for the full storefront",
    "",
    `Live drop: 3 stickers · 50 each · price after proof`,
  ].join("\n");
}

function menuRow(): [{ text: string; callback_data: string }] {
  return [{ text: "← Menu", callback_data: "menu" }];
}

function menuKeyboard(): InlineKeyboard {
  return inlineKeyboard([
    [
      { text: "🛒 Shop", callback_data: "shop" },
      { text: "🌐 Website", url: shopUrl() },
    ],
    [
      { text: "💬 Chat", callback_data: "chat" },
      { text: "📋 Cart", callback_data: "cart" },
    ],
    [{ text: "⚙️ Ops console", url: shopUrl("/app") }],
  ]);
}

function shopContextKeyboard(): InlineKeyboard {
  return inlineKeyboard([
    LIVE_SHOP_PRODUCTS.map((p) => ({
      text: p.sku,
      callback_data: `p:${p.sku.slice(-3)}`,
    })),
    [
      { text: "🛒 Full catalog", callback_data: "shop" },
      { text: "📋 Cart", callback_data: "cart" },
      { text: "🌐 Website", url: shopUrl() },
    ],
    menuRow(),
  ]);
}

function inlineKeyboard(rows: InlineKeyboard["inline_keyboard"]) {
  return { inline_keyboard: rows };
}

async function sendMainMenu(chatId: number, text: string) {
  await sendTelegramMessage(chatId, text, menuKeyboard());
}

async function sendShopMenu(chatId: number) {
  const lines = LIVE_SHOP_PRODUCTS.map(
    (p) => `• <b>${p.name}</b> (${p.sku}) — ${p.price} · run ${p.run}`,
  ).join("\n");
  const rows = LIVE_SHOP_PRODUCTS.map((p) => [
    { text: `${p.sku} · ${p.name}`, callback_data: `p:${p.sku.slice(-3)}` },
  ]);
  rows.push(menuRow());
  await sendTelegramMessage(
    chatId,
    `<b>Live drop · stickers</b>\n\n${lines}\n\nTap a SKU for details.`,
    inlineKeyboard(rows),
  );
}

async function sendProduct(chatId: number, sku: string) {
  const product = liveProduct(sku);
  if (!product) {
    await sendShopMenu(chatId);
    return;
  }
  const suffix = sku.slice(-3);
  await sendTelegramMessage(
    chatId,
    [
      `<b>${product.name}</b> · ${product.sku}`,
      product.composition,
      `Run: ${product.run} · Price: ${product.price}`,
      product.ships,
    ].join("\n"),
    inlineKeyboard([
      [
        { text: "➕ Add to cart", callback_data: `a:${suffix}` },
        { text: "Request on web", url: shopUrl("/pod-request.html") },
      ],
      [{ text: "← Shop", callback_data: "shop" }, ...menuRow()],
    ]),
  );
}

async function addToCart(ctx: ActionCtx, chatId: number, sku: string) {
  const product = liveProduct(sku);
  if (!product) return;

  const session = await ctx.runQuery(internal.telegramBot.getSession, { chatId });
  const cart: CartLine[] = [...(session?.cart ?? [])];
  const line = cart.find((c) => c.sku === sku);
  if (line) line.qty += 1;
  else cart.push({ sku, qty: 1 });

  await ctx.runMutation(internal.telegramBot.upsertSession, { chatId, cart });
  await sendTelegramMessage(
    chatId,
    `Added <b>${product.name}</b> to your cart.\n\nTap Cart to review or request on web.`,
    inlineKeyboard([
      [
        { text: "📋 View cart", callback_data: "cart" },
        { text: "Request on web", url: shopUrl("/pod-request.html") },
      ],
      menuRow(),
    ]),
  );
}

async function sendCart(ctx: ActionCtx, chatId: number) {
  const session = await ctx.runQuery(internal.telegramBot.getSession, { chatId });
  const cart = session?.cart ?? [];
  if (cart.length === 0) {
    await sendTelegramMessage(
      chatId,
      "Cart is empty. Tap Shop to browse the sticker drop.",
      inlineKeyboard([[{ text: "🛒 Shop", callback_data: "shop" }], menuRow()]),
    );
    return;
  }

  const lines = cart
    .map((line) => {
      const product = liveProduct(line.sku);
      return `• ${product?.name ?? line.sku} × ${line.qty}`;
    })
    .join("\n");

  await sendTelegramMessage(
    chatId,
    `<b>Your selection</b>\n\n${lines}\n\nFinish on the web — price locks after proof.`,
    inlineKeyboard([
      [{ text: "Submit request on web", url: shopUrl("/pod-request.html") }],
      [
        { text: "Clear cart", callback_data: "clear" },
        { text: "🛒 Shop", callback_data: "shop" },
      ],
      menuRow(),
    ]),
  );
}
