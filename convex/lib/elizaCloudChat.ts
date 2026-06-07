import { shopUrl } from "./liveShopCatalog";
import { managerConversationalReply } from "./managerConcierge";
import { formatOpsContext, type OpsSnapshot } from "./opsSnapshot";
import { shopConversationalReply } from "./shopConcierge";
import type { TelegramBotRole } from "./telegramApi";

const STORE_SYSTEM = `You are dotCache — optional shop assistant for .cache (only when customer explicitly opens chat).

Live shop: ${shopUrl()} — Cozy Devs Sticker Pack (STICKER-PACK-001), 50 packs. Customers normally browse via buttons, not chat.

Keep answers short. No ops jargon.`;

const MANAGER_SYSTEM = `You are dotCache Manager — the fulfillment and ops agent for .cache operators.

You run agentic fulfillment on the backend: orders, Prodigi, inventory, catalog review, proposals. Humans approve publish, payment, and ship. Never claim you executed money-moving actions.

The store bot is a separate simple menu for customers — this channel is operators only. Answer with live ops data when provided. Be direct and operational. No generic assistant filler.`;

function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const value = globalProcess.process?.env?.[key]?.trim();
  return value || undefined;
}

function systemPrompt(role: TelegramBotRole, opsContext?: string) {
  const base = role === "manager" ? MANAGER_SYSTEM : STORE_SYSTEM;
  if (role === "manager" && opsContext) {
    return `${base}\n\n${opsContext}`;
  }
  return base;
}

export async function elizaCloudChat(
  userText: string,
  role: TelegramBotRole = "store",
  opsSnap?: OpsSnapshot,
): Promise<string> {
  const apiKey = envValue("CACHE_ELIZA_API_KEY") ?? envValue("ELIZA_API_KEY");
  const baseUrl = (envValue("CACHE_ELIZA_BASE_URL") ?? "https://www.elizacloud.ai").replace(/\/+$/, "");
  const opsContext = opsSnap ? formatOpsContext(opsSnap) : undefined;

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
              { role: "system", content: systemPrompt(role, opsContext) },
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

  if (role === "manager" && opsSnap) {
    return managerConversationalReply(userText, opsSnap);
  }
  return shopConversationalReply(userText);
}
