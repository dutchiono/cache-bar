import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { internalAction } from "./_generated/server";
import { elizaCloudChat } from "./lib/elizaCloudChat";
import { shopUrl } from "./lib/liveShopCatalog";
import { answerCallbackQuery, type InlineKeyboard, sendTelegramMessage } from "./lib/telegramApi";

const BOT = "manager" as const;

export const processUpdate = internalAction({
  args: { update: v.any() },
  handler: async (ctx, { update }) => {
    if (update?.callback_query) {
      await handleCallback(update.callback_query);
      return;
    }
    if (update?.message) {
      await handleMessage(ctx, update.message);
    }
  },
});

async function handleCallback(
  callback: {
    id: string;
    data?: string;
    message?: { chat: { id: number } };
  },
) {
  const chatId = callback.message?.chat?.id;
  if (!chatId || !callback.data) return;

  await answerCallbackQuery(BOT, callback.id);
  if (callback.data === "console") {
    await sendTelegramMessage(
      BOT,
      chatId,
      `Ops console: ${shopUrl("/app")}`,
      consoleKeyboard(),
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

  await sendAgentReply(ctx, chatId, text);
}

async function sendAgentReply(ctx: ActionCtx, chatId: number, text: string) {
  const snap = await ctx.runQuery(internal.telegramSessions.opsSnapshot, {});
  const reply = await elizaCloudChat(text, BOT, snap, chatId);
  await sendTelegramMessage(BOT, chatId, reply, consoleKeyboard());
}

function consoleKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [[{ text: "⚙️ Web console", url: shopUrl("/app") }]],
  };
}
