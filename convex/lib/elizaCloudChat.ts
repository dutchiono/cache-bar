import { LIVE_SHOP_PRODUCT, shopUrl } from "./liveShopCatalog";
import { managerConversationalReply } from "./managerConcierge";
import { shopConversationalReply } from "./shopConcierge";
import type { TelegramBotRole } from "./telegramApi";

const STORE_SYSTEM = `You are dotCache — the customer-facing shop agent for .cache.

Live shop: ${shopUrl()} — one product: Cozy Devs Sticker Pack (STICKER-PACK-001). Each pack contains all three stickers (Moon Seal, Floppy, Bus Riot) plus a proof NFT. 50 packs total. Price after proof.

You run the simple store Telegram bot. Customers may talk AND use shop buttons. Answer warmly and specifically. No ops jargon. Never mention the manager bot.

No generic "how can I help" filler. No emoji spam. Never claim you charged a card or published a product.`;

const MANAGER_SYSTEM = `You are dotCache Manager — the ops and fulfillment agent for .cache on the operator Telegram bot.

You help staff with orders, Prodigi fulfillment, inventory, catalog review, and agent proposals. Humans approve publish, payment, and fulfillment. Never claim you executed money-moving actions.

Live product: Cozy Devs Sticker Pack (STICKER-PACK-001), 50 packs. Store customers use a separate simple shop bot — this bot is operators only.

Answer directly and operationally. No generic assistant filler.`;

function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const value = globalProcess.process?.env?.[key]?.trim();
  return value || undefined;
}

function systemPrompt(role: TelegramBotRole) {
  return role === "manager" ? MANAGER_SYSTEM : STORE_SYSTEM;
}

function localFallback(role: TelegramBotRole, userText: string) {
  return role === "manager" ? managerConversationalReply(userText) : shopConversationalReply(userText);
}

export async function elizaCloudChat(userText: string, role: TelegramBotRole = "store"): Promise<string> {
  const apiKey = envValue("CACHE_ELIZA_API_KEY") ?? envValue("ELIZA_API_KEY");
  const baseUrl = (envValue("CACHE_ELIZA_BASE_URL") ?? "https://www.elizacloud.ai").replace(/\/+$/, "");

  if (apiKey) {
    const models = ["openai/gpt-4o-mini", "gpt-4o-mini"];
    for (const model of models) {
      try {
        const response = await fetch(`${baseUrl}/api/v1/chat/completions`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: 600,
            messages: [
              { role: "system", content: systemPrompt(role) },
              { role: "user", content: userText },
            ],
          }),
        });

        if (!response.ok) continue;

        const body = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = body.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      } catch {
        continue;
      }
    }
  }

  return localFallback(role, userText);
}

export function packSummaryLine() {
  const p = LIVE_SHOP_PRODUCT;
  return `${p.name} · ${p.includes.join(", ")} · ${p.run}`;
}
