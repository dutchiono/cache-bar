import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { internalAction } from "./_generated/server";
import { elizaCloudChat } from "./lib/elizaCloudChat";
import { LIVE_SHOP_PRODUCT, liveProduct, shopCatalogSummary, shopUrl } from "./lib/liveShopCatalog";
import {
  answerCallbackQuery,
  type InlineKeyboard,
  sendTelegramMessage,
} from "./lib/telegramApi";

const BOT = "store" as const;
const PACK_SKU = LIVE_SHOP_PRODUCT.sku;

type CartLine = { sku: string; qty: number };

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

async function handleCallback(
  ctx: ActionCtx,
  callback: {
    id: string;
    data?: string;
    message?: { chat: { id: number } };
  },
) {
  const chatId = callback.message?.chat?.id;
  if (!chatId || !callback.data) return;

  await answerCallbackQuery(BOT, callback.id);

  const data = callback.data;
  if (data === "menu") {
    await ctx.runMutation(internal.telegramSessions.upsertSession, {
      bot: BOT,
      chatId,
      mode: "menu",
    });
    await sendMainMenu(chatId, "Main menu");
    return;
  }
  if (data === "shop" || data === "pack") {
    await sendShopMenu(chatId);
    return;
  }
  if (data === "cart") {
    await sendCart(ctx, chatId);
    return;
  }
  if (data === "clear") {
    await ctx.runMutation(internal.telegramSessions.upsertSession, {
      bot: BOT,
      chatId,
      cart: [],
    });
    await sendTelegramMessage(BOT, chatId, "Cart cleared.", menuKeyboard());
    return;
  }
  if (data === "add") {
    await addToCart(ctx, chatId, PACK_SKU);
    return;
  }
}

async function handleMessage(
  ctx: ActionCtx,
  message: {
    chat: { id: number };
    text?: string;
  },
) {
  const chatId = message.chat.id;
  const text = (message.text ?? "").trim();
  if (!text) return;

  const lower = text.toLowerCase();
  if (lower === "/start" || lower === "/menu" || lower === "menu") {
    await ctx.runMutation(internal.telegramSessions.upsertSession, {
      bot: BOT,
      chatId,
      mode: "menu",
    });
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
    await ctx.runMutation(internal.telegramSessions.upsertSession, {
      bot: BOT,
      chatId,
      mode: "chat",
    });
    await sendTelegramMessage(
      BOT,
      chatId,
      "Chat mode — optional. Tap Menu anytime to go back to the shop.",
      menuKeyboard(),
    );
    return;
  }
  if (lower === "/website" || lower === "website") {
    await sendTelegramMessage(
      BOT,
      chatId,
      `Shop online: ${shopUrl()}`,
      inlineKeyboard([[{ text: "Open shop", url: shopUrl() }], menuRow()]),
    );
    return;
  }

  const session = await ctx.runQuery(internal.telegramSessions.getSession, { bot: BOT, chatId });
  if (session?.mode === "chat") {
    const reply = await elizaCloudChat(text, BOT, undefined, chatId);
    await sendTelegramMessage(BOT, chatId, reply, menuKeyboard());
    return;
  }

  if (looksLikeShopQuery(text) || lower.includes("menu") || lower.includes("browse")) {
    await sendShopMenu(chatId);
    return;
  }

  await sendMainMenu(chatId, "Tap below to browse the sticker pack.");
}

function looksLikeShopQuery(text: string) {
  const lower = text.toLowerCase();
  return (
    /\b(shop|store|catalog|catalogue|drop|sticker|stickers|pack|sku|inventory|buy|price|cost|nft)\b/.test(
      lower,
    ) ||
    /\bwhat('s|s| is) in\b/.test(lower) ||
    /\bwhast in\b/.test(lower)
  );
}

function welcomeText() {
  const p = LIVE_SHOP_PRODUCT;
  return [
    "<b>.cache shop</b>",
    "",
    `<b>${p.name}</b>`,
    `${p.includes.join(" · ")}`,
    `${p.run} · price after proof`,
    "",
    "Tap below to browse.",
  ].join("\n");
}

function menuRow(): [{ text: string; callback_data: string }] {
  return [{ text: "← Menu", callback_data: "menu" }];
}

function menuKeyboard(): InlineKeyboard {
  return inlineKeyboard([
    [
      { text: "📦 Sticker pack", callback_data: "pack" },
      { text: "🌐 Website", url: shopUrl() },
    ],
    [{ text: "📋 Cart", callback_data: "cart" }],
  ]);
}

function inlineKeyboard(rows: InlineKeyboard["inline_keyboard"]) {
  return { inline_keyboard: rows };
}

async function sendMainMenu(chatId: number, text: string) {
  await sendTelegramMessage(BOT, chatId, text, menuKeyboard());
}

async function sendShopMenu(chatId: number) {
  await sendTelegramMessage(
    BOT,
    chatId,
    `<b>Live drop</b>\n\n${shopCatalogSummary({ html: true })}`,
    inlineKeyboard([
      [
        { text: "➕ Add pack to cart", callback_data: "add" },
        { text: "Request on web", url: shopUrl("/pod-request.html") },
      ],
      [
        { text: "🌐 Full storefront", url: shopUrl() },
        { text: "📋 Cart", callback_data: "cart" },
      ],
      menuRow(),
    ]),
  );
}

async function addToCart(ctx: ActionCtx, chatId: number, sku: string) {
  const product = liveProduct(sku);
  if (!product) return;

  const session = await ctx.runQuery(internal.telegramSessions.getSession, {
    bot: BOT,
    chatId,
  });
  const cart: CartLine[] = [...(session?.cart ?? [])];
  const line = cart.find((c) => c.sku === sku);
  if (line) line.qty += 1;
  else cart.push({ sku, qty: 1 });

  await ctx.runMutation(internal.telegramSessions.upsertSession, {
    bot: BOT,
    chatId,
    cart,
  });
  await sendTelegramMessage(
    BOT,
    chatId,
    `Added <b>${product.name}</b> to your cart.\n\nIncludes: ${product.includes.join(", ")}`,
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
  const session = await ctx.runQuery(internal.telegramSessions.getSession, {
    bot: BOT,
    chatId,
  });
  const cart = session?.cart ?? [];
  if (cart.length === 0) {
    await sendTelegramMessage(
      BOT,
      chatId,
      "Cart is empty. Tap Sticker pack to see the Cozy Devs 3-pack.",
      inlineKeyboard([[{ text: "📦 Sticker pack", callback_data: "pack" }], menuRow()]),
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
    BOT,
    chatId,
    `<b>Your selection</b>\n\n${lines}\n\nFinish on the web — price locks after proof.`,
    inlineKeyboard([
      [{ text: "Submit request on web", url: shopUrl("/pod-request.html") }],
      [
        { text: "Clear cart", callback_data: "clear" },
        { text: "📦 Sticker pack", callback_data: "pack" },
      ],
      menuRow(),
    ]),
  );
}
