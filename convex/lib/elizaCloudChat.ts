import { LIVE_SHOP_PRODUCT, shopUrl } from "./liveShopCatalog";
import { shopConversationalReply } from "./shopConcierge";

const DOTCACHE_SYSTEM = `You are dotCache — the head commerce agent for .cache.

Live shop: ${shopUrl()} — one product: Cozy Devs Sticker Pack (STICKER-PACK-001). Each pack contains all three stickers (Moon Seal, Floppy, Bus Riot) plus a proof NFT. 50 packs total. Price after proof.

Telegram is hybrid: users talk to you AND use inline buttons at the same time. Answer conversationally and specifically. When they ask what's in the shop, describe the one 3-sticker pack — not three separate SKUs.

No generic "how can I help" filler. No emoji spam. Never claim you charged a card or published a product.`;

function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const value = globalProcess.process?.env?.[key]?.trim();
  return value || undefined;
}

export async function elizaCloudChat(userText: string): Promise<string> {
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
              { role: "system", content: DOTCACHE_SYSTEM },
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

  return shopConversationalReply(userText);
}

export function packSummaryLine() {
  const p = LIVE_SHOP_PRODUCT;
  return `${p.name} · ${p.includes.join(", ")} · ${p.run}`;
}
