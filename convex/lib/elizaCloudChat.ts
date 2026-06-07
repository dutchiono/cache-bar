const DOTCACHE_SYSTEM = `You are dotCache — the head commerce agent for .cache.

Live shop: https://dotcache.bushleague.xyz — three sticker SKUs (CST-001 Cache Mark, CST-002 Proof Label, CST-003 Seal Holo), 50 units each, request flow open, price after proof.

Users may also tap buttons in Telegram to browse the shop without chatting. When they chat, be specific about the drop and flow. No generic "how can I help" filler. No emoji spam.

You propose catalog and ops work; humans approve publish and payment. Never claim you charged a card or published a product.`;

function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const value = globalProcess.process?.env?.[key]?.trim();
  return value || undefined;
}

export async function elizaCloudChat(userText: string): Promise<string> {
  const apiKey = envValue("CACHE_ELIZA_API_KEY") ?? envValue("ELIZA_API_KEY");
  const baseUrl = (envValue("CACHE_ELIZA_BASE_URL") ?? "https://www.elizacloud.ai").replace(/\/+$/, "");

  if (!apiKey) {
    return "Chat backend is not configured yet. Use the Shop button to browse stickers or open the website.";
  }

  const agentId = envValue("CACHE_ELIZA_AGENT_ID") ?? envValue("ELIZA_AGENT_ID");
  const models = agentId ? [`openai/${agentId}`, "openai/gpt-4o-mini"] : ["openai/gpt-4o-mini"];

  for (const model of models) {
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

    if (!response.ok) {
      continue;
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content?.trim();
    if (content) return content;
  }

  return "I couldn't reach the model right now. Tap Shop to browse stickers or open the website.";
}
