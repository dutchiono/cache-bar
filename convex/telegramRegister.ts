import { internalAction } from "./_generated/server";
import {
  convexTelegramStoreWebhookUrlLegacy,
  convexTelegramWebhookUrl,
  setTelegramWebhook,
  telegramBotConfigured,
} from "./lib/telegramApi";

export const registerWebhooks = internalAction({
  args: {},
  handler: async () => {
    const results: Array<{ role: string; ok: boolean; webhookUrl?: string; error?: string }> = [];

    if (telegramBotConfigured("store")) {
      const storeUrl = convexTelegramStoreWebhookUrlLegacy();
      try {
        await setTelegramWebhook("store", storeUrl);
        results.push({ role: "store", ok: true, webhookUrl: storeUrl });
      } catch (error) {
        results.push({
          role: "store",
          ok: false,
          error: error instanceof Error ? error.message : "store webhook failed",
        });
      }
    }

    if (telegramBotConfigured("manager")) {
      const managerUrl = convexTelegramWebhookUrl("manager");
      try {
        await setTelegramWebhook("manager", managerUrl);
        results.push({ role: "manager", ok: true, webhookUrl: managerUrl });
      } catch (error) {
        results.push({
          role: "manager",
          ok: false,
          error: error instanceof Error ? error.message : "manager webhook failed",
        });
      }
    }

    return results;
  },
});
