import { LIVE_SHOP_PRODUCT, shopCatalogSummary, shopUrl } from "./liveShopCatalog";

export type ShopConciergeChannel = "web" | "telegram";

/** Local conversational replies when Eliza Cloud inference is unavailable. */
export function shopConversationalReply(
  text: string,
  options: { channel?: ShopConciergeChannel } = {},
): string {
  const channel = options.channel ?? "telegram";
  const lower = text.toLowerCase().trim();

  if (isShopGreeting(lower)) {
    return channel === "web"
      ? "Yeah, I'm here. One live product right now — the Cozy Devs Sticker Pack with Moon Seal, Floppy, and Bus Riot. Ask about the pack, pricing, or checkout."
      : "Hey — I'm dotCache. One product live right now: the Cozy Devs 3-sticker pack. Ask about it or tap Shop below.";
  }

  if (
    lower.includes("what") &&
    (lower.includes("shop") ||
      lower.includes("sale") ||
      lower.includes("sell") ||
      lower.includes("buy") ||
      lower.includes("in the"))
  ) {
    return [
      "Right now there is one live product: the Cozy Devs Sticker Pack.",
      "Each pack has all three stickers — Moon Seal, Floppy, and Bus Riot — plus a proof NFT for your wallet.",
      "50 packs total. Price locks after artwork proof.",
      `Browse on web: ${shopUrl()}`,
    ].join(" ");
  }

  if (lower.includes("sticker") || lower.includes("pack") || lower.includes("drop")) {
    const cta =
      channel === "web"
        ? `Open the shop: ${shopUrl()} · request flow: ${shopUrl("/pod-request.html")}`
        : "Tap the pack button below to add one, or open the website to request/checkout.";
    return [
      "The Cozy Devs Sticker Pack is the active drop.",
      "Three stickers in one pack, 50 packs in the run, proof NFT included.",
      cta,
    ].join(" ");
  }

  if (lower.includes("price") || lower.includes("cost") || lower.includes("how much")) {
    return "Price is TBD until artwork proof, Prodigi quote, shipping, and margin are approved. The request flow is open now if you want in early.";
  }

  if (lower.includes("nft") || lower.includes("proof")) {
    return "Each pack buyer gets a sticker-pack proof NFT tied to their wallet as part of the demo run.";
  }

  if (lower.includes("request") || lower.includes("checkout") || lower.includes("order")) {
    return `Request or checkout on the web at ${shopUrl("/pod-request.html")}. I can answer questions here; payment and fulfillment still go through .cache ops approval.`;
  }

  const summary = shopCatalogSummary().replace(/<[^>]+>/g, "");
  const cta =
    channel === "web"
      ? `Shop: ${shopUrl()} · request: ${shopUrl("/pod-request.html")}`
      : "Ask about the pack, or use the buttons to browse and add to cart.";

  return [`Live shop: ${LIVE_SHOP_PRODUCT.name} (${LIVE_SHOP_PRODUCT.sku}).`, summary, cta].join("\n\n");
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
