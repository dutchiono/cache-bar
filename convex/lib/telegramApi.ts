function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const value = globalProcess.process?.env?.[key]?.trim();
  return value || undefined;
}

export function telegramBotToken() {
  const token = envValue("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN.");
  return token;
}

export type InlineKeyboard = { inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>> };

export async function telegramCall<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = telegramBotToken();
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { ok?: boolean; description?: string; result?: T };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? `Telegram ${method} failed (${response.status}).`);
  }
  return payload.result as T;
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  replyMarkup?: InlineKeyboard,
) {
  return telegramCall("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return telegramCall("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

export async function setTelegramWebhook(webhookUrl: string) {
  return telegramCall("setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  });
}

export function convexTelegramWebhookUrl() {
  const site =
    envValue("CONVEX_SITE_URL") ??
    envValue("CONVEX_URL")?.replace(/\.convex\.cloud\b/, ".convex.site");
  if (!site) throw new Error("Missing CONVEX_SITE_URL.");
  return `${site.replace(/\/+$/, "")}/telegram/webhook`;
}
