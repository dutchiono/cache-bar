import { shopUrl } from "./liveShopCatalog";

/** Local ops replies when Eliza Cloud inference is unavailable. */
export function managerConversationalReply(text: string): string {
  const lower = text.toLowerCase();

  if (lower.includes("fulfill") || lower.includes("prodigi") || lower.includes("ship")) {
    return [
      "Fulfillment runs through Prodigi after proof approval.",
      "I can summarize pending orders and inventory — tap Fulfillment or Orders below.",
      "Money-moving and publish actions still need human approval in the web console.",
    ].join(" ");
  }

  if (lower.includes("order") || lower.includes("request")) {
    return "Tap Orders for a snapshot of recent activity, or open the ops console for full detail.";
  }

  if (lower.includes("catalog") || lower.includes("product") || lower.includes("sku")) {
    return "Live SKU: STICKER-PACK-001 (Cozy Devs 3-sticker pack, 50 run). Catalog edits go through review before publish.";
  }

  if (lower.includes("proposal") || lower.includes("approve")) {
    return "Agent proposals queue in the ops console. I propose; you approve publish, payment, and fulfillment.";
  }

  if (lower.includes("hi") || lower.includes("hello")) {
    return "dotCache Manager — fulfillment and ops. Ask about orders, inventory, or fulfillment, or use the buttons.";
  }

  return [
    "I'm the manager bot — backend agent for fulfillment and ops.",
    "Store customers use the separate shop bot; this channel is for operators.",
    `Web console: ${shopUrl("/app")}`,
  ].join(" ");
}
