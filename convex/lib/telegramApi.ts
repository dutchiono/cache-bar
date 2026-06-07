function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const value = globalProcess.process?.env?.[key]?.trim();
  return value || undefined;
}

export type TelegramBotRole = "store" | "manager";

const TOKEN_ENV: Record<TelegramBotRole, string> = {
  store: "TELEGRAM_BOT_TOKEN",
  manager: "TELEGRAM_MANAGER_BOT_TOKEN",
};

export function telegramBotToken(role: TelegramBotRole) {
  const token = envValue(TOKEN_ENV[role]);
  if (!token) throw new Error(`Missing ${TOKEN_ENV[role]}.`);
  return token;
}

export function telegramBotConfigured(role: TelegramBotRole) {
  return Boolean(envValue(TOKEN_ENV[role]));
}

export type InlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
};

export async function telegramCall<T = unknown>(
  role: TelegramBotRole,
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const token = telegramBotToken(role);
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
  role: TelegramBotRole,
  chatId: number,
  text: string,
  replyMarkup?: InlineKeyboard,
) {
  return telegramCall(role, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });
}

export async function answerCallbackQuery(
  role: TelegramBotRole,
  callbackQueryId: string,
  text?: string,
) {
  return telegramCall(role, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

export async function setTelegramWebhook(role: TelegramBotRole, webhookUrl: string) {
  return telegramCall(role, "setWebhook", {
    url: webhookUrl,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  });
}

export function convexTelegramWebhookUrl(role: TelegramBotRole) {
  const site =
    envValue("CONVEX_SITE_URL") ??
    envValue("CONVEX_URL")?.replace(/\.convex\.cloud\b/, ".convex.site");
  if (!site) throw new Error("Missing CONVEX_SITE_URL.");
  const base = site.replace(/\/+$/, "");
  if (role === "store") return `${base}/telegram/store/webhook`;
  return `${base}/telegram/manager/webhook`;
}

/** Legacy path — same as store webhook. */
export function convexTelegramStoreWebhookUrlLegacy() {
  const site =
    envValue("CONVEX_SITE_URL") ??
    envValue("CONVEX_URL")?.replace(/\.convex\.cloud\b/, ".convex.site");
  if (!site) throw new Error("Missing CONVEX_SITE_URL.");
  return `${site.replace(/\/+$/, "")}/telegram/webhook`;
}
