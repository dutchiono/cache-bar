import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { internalAction } from "./_generated/server";
import { elizaCloudChat } from "./lib/elizaCloudChat";
import { LIVE_SHOP_PRODUCT, shopUrl } from "./lib/liveShopCatalog";
import {
  answerCallbackQuery,
  type InlineKeyboard,
  sendTelegramMessage,
} from "./lib/telegramApi";

const BOT = "manager" as const;

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
    await sendMainMenu(chatId);
    return;
  }
  if (data === "orders") {
    await sendOrdersSnapshot(ctx, chatId);
    return;
  }
  if (data === "fulfillment") {
    await sendFulfillmentSnapshot(ctx, chatId);
    return;
  }
  if (data === "catalog") {
    await sendCatalogSnapshot(chatId);
    return;
  }
  if (data === "console") {
    await sendTelegramMessage(
      BOT,
      chatId,
      `Ops console: ${shopUrl("/app")}\nAgent chat: ${shopUrl("/app/agent")}`,
      inlineKeyboard([[{ text: "Open console", url: shopUrl("/app") }], menuRow()]),
    );
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
    await sendMainMenu(chatId);
    return;
  }
  if (lower === "/orders") {
    await sendOrdersSnapshot(ctx, chatId);
    return;
  }
  if (lower === "/fulfillment") {
    await sendFulfillmentSnapshot(ctx, chatId);
    return;
  }
  if (lower === "/catalog") {
    await sendCatalogSnapshot(chatId);
    return;
  }

  const reply = await elizaCloudChat(text, BOT);
  await sendTelegramMessage(BOT, chatId, reply, menuKeyboard());
}

async function sendMainMenu(chatId: number) {
  await sendTelegramMessage(BOT, chatId, welcomeText(), menuKeyboard());
}

async function sendOrdersSnapshot(ctx: ActionCtx, chatId: number) {
  const snap = await ctx.runQuery(internal.telegramSessions.opsSnapshot, {});
  await sendTelegramMessage(
    BOT,
    chatId,
    [
      "<b>Orders snapshot</b>",
      `Total orders: ${snap.totalOrders}`,
      `Active (awaiting payment → partially fulfilled): ${snap.activeOrders}`,
      `Submissions in review: ${snap.newSubmissions}`,
    ].join("\n"),
    menuKeyboard(),
  );
}

async function sendFulfillmentSnapshot(ctx: ActionCtx, chatId: number) {
  const snap = await ctx.runQuery(internal.telegramSessions.opsSnapshot, {});
  const onHand = snap.stickerOnHand ?? "—";
  const reserved = snap.stickerReserved ?? "—";
  await sendTelegramMessage(
    BOT,
    chatId,
    [
      "<b>Fulfillment · sticker pack</b>",
      `SKU: STICKER-PACK-001`,
      `On hand: ${onHand} · Reserved: ${reserved}`,
      "Prodigi handles proof → quote → ship after ops approval.",
    ].join("\n"),
    menuKeyboard(),
  );
}

async function sendCatalogSnapshot(chatId: number) {
  const p = LIVE_SHOP_PRODUCT;
  await sendTelegramMessage(
    BOT,
    chatId,
    [
      "<b>Live catalog</b>",
      `${p.name} (${p.sku})`,
      `Includes: ${p.includes.join(", ")}`,
      `Run: ${p.run} · Price: ${p.price}`,
    ].join("\n"),
    menuKeyboard(),
  );
}

function welcomeText() {
  return [
    "<b>dotCache Manager</b>",
    "",
    "Ops and fulfillment — talk to me or tap buttons.",
    "Customers use the separate shop bot; this one is for operators.",
  ].join("\n");
}

function menuRow(): [{ text: string; callback_data: string }] {
  return [{ text: "← Menu", callback_data: "menu" }];
}

function menuKeyboard(): InlineKeyboard {
  return inlineKeyboard([
    [
      { text: "📋 Orders", callback_data: "orders" },
      { text: "📦 Fulfillment", callback_data: "fulfillment" },
    ],
    [
      { text: "🏷 Catalog", callback_data: "catalog" },
      { text: "⚙️ Console", callback_data: "console" },
    ],
    [{ text: "🌐 Web console", url: shopUrl("/app") }],
  ]);
}

function inlineKeyboard(rows: InlineKeyboard["inline_keyboard"]) {
  return { inline_keyboard: rows };
}
