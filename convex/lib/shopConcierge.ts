import {
  LIVE_SHOP_PRODUCT,
  shopAgentContext,
  shopCatalogSummary,
  shopLinksText,
} from "./liveShopCatalog";

export type ShopConciergeChannel = "web" | "telegram";

/** Local fallback when Eliza is unavailable — all copy derived from liveShopCatalog. */
export function shopConversationalReply(
  text: string,
  options: { channel?: ShopConciergeChannel } = {},
): string {
  const channel = options.channel ?? "telegram";
  const lower = text.toLowerCase().trim();
  const product = LIVE_SHOP_PRODUCT;

  if (isShopGreeting(lower)) {
    return channel === "web"
      ? `Yeah, I'm here. One live product — ${product.name} (${product.includes.join(", ")}). Ask about the pack, pricing, or checkout.\n\n${shopLinksText()}`
      : `Hey — I'm dotCache. One product live: ${product.name}. Ask about it or tap Shop below.\n\n${shopLinksText()}`;
  }

  const lead = pickLead(lower, channel);
  return [lead, shopCatalogSummary(), shopLinksText()].filter(Boolean).join("\n\n");
}

/** Re-export for tests / agent wiring. */
export { shopAgentContext };

function pickLead(lower: string, channel: ShopConciergeChannel): string {
  const product = LIVE_SHOP_PRODUCT;

  if (
    lower.includes("price") ||
    lower.includes("cost") ||
    lower.includes("how much")
  ) {
    return `Price is ${product.price} until artwork proof, Prodigi quote, shipping, and margin are approved.`;
  }

  if (lower.includes("nft") || (lower.includes("proof") && !lower.includes("approval"))) {
    return "Each pack buyer gets a sticker-pack proof NFT tied to their wallet as part of the demo run.";
  }

  if (channel === "telegram" && !lower.includes("http")) {
    return `Live shop: ${product.name} (${product.sku}). Use the buttons below or these links:`;
  }

  return `Live shop: ${product.name} (${product.sku}).`;
}

function isShopGreeting(lower: string) {
  return (
    /^(hi|hey|hello|yo|sup)[!.?\s]*$/i.test(lower) ||
    lower.includes("are you there") ||
    lower.includes("you there") ||
    lower.includes("anyone there") ||
    lower.includes("anyone home") ||
    lower.includes("still there") ||
    /^hello\??$/.test(lower) ||
    (lower.includes("hi") && lower.length < 24) ||
    (lower.includes("hello") && lower.length < 32)
  );
}
