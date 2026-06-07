import { LIVE_SHOP_PRODUCT, shopCatalogSummary, shopUrl } from "./liveShopCatalog";

/** Local conversational replies when Eliza Cloud inference is unavailable. */
export function shopConversationalReply(text: string): string {
  const lower = text.toLowerCase();

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
    return [
      "The Cozy Devs Sticker Pack is the active drop.",
      "Three stickers in one pack, 50 packs in the run, proof NFT included.",
      "Tap the pack button below to add one, or open the website to request/checkout.",
    ].join(" ");
  }

  if (lower.includes("price") || lower.includes("cost") || lower.includes("how much")) {
    return "Price is TBD until artwork proof, Prodigi quote, shipping, and margin are approved. Request flow is open now.";
  }

  if (lower.includes("nft") || lower.includes("proof")) {
    return "Each pack buyer gets a sticker-pack proof NFT tied to their wallet as part of the demo run.";
  }

  if (lower.includes("request") || lower.includes("checkout") || lower.includes("order")) {
    return `Request or checkout on the web at ${shopUrl("/pod-request.html")}. I can answer questions here; payment and fulfillment still go through .cache ops approval.`;
  }

  if (lower.includes("hi") || lower.includes("hello") || lower.includes("there")) {
    return "Hey — I'm dotCache. One product live right now: the Cozy Devs 3-sticker pack. Ask about it or tap Shop below.";
  }

  return [
    `Live shop: ${LIVE_SHOP_PRODUCT.name} (${LIVE_SHOP_PRODUCT.sku}).`,
    shopCatalogSummary().replace(/<[^>]+>/g, ""),
    "Ask about the pack, or use the buttons to browse and add to cart.",
  ].join("\n\n");
}
