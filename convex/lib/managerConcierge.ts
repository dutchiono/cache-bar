import { shopUrl } from "./liveShopCatalog";
import { formatOpsContext, type OpsSnapshot } from "./opsSnapshot";

/** Agent-style ops replies when Eliza inference is unavailable. */
export function managerConversationalReply(text: string, snap: OpsSnapshot): string {
  const lower = text.toLowerCase();
  const ctx = formatOpsContext(snap);

  if (lower.includes("order") || lower.includes("request")) {
    return [
      ctx,
      "",
      snap.activeOrders === 0
        ? "No active orders right now. I will flag new ones as they land."
        : `${snap.activeOrders} order(s) need attention — paid, processing, or awaiting fulfillment.`,
      `Full detail: ${shopUrl("/app")}`,
    ].join("\n");
  }

  if (lower.includes("fulfill") || lower.includes("prodigi") || lower.includes("ship") || lower.includes("inventory")) {
    const onHand = snap.stickerOnHand ?? "unknown";
    const reserved = snap.stickerReserved ?? "unknown";
    return [
      ctx,
      "",
      `Sticker pack run: ${onHand} on hand, ${reserved} reserved.`,
      "Prodigi path: proof → quote → ship. I can prep proposals; you approve before anything moves.",
    ].join("\n");
  }

  if (lower.includes("catalog") || lower.includes("product") || lower.includes("sku")) {
    return [
      ctx,
      "",
      "Live SKU: STICKER-PACK-001 — Cozy Devs 3-sticker pack, 50 run.",
      snap.newSubmissions > 0
        ? `${snap.newSubmissions} submission(s) waiting in review.`
        : "Catalog queue is clear.",
    ].join("\n");
  }

  if (lower.includes("proposal") || lower.includes("approve")) {
    return [
      "I propose catalog and fulfillment actions; humans approve publish and payment.",
      ctx,
      `Approve in console: ${shopUrl("/app")}`,
    ].join("\n\n");
  }

  if (lower.includes("hi") || lower.includes("hello") || lower === "/start") {
    return [
      "dotCache Manager — fulfillment agent on the backend.",
      ctx,
      "Ask about orders, inventory, Prodigi, or what needs approval.",
    ].join("\n\n");
  }

  return [
    ctx,
    "",
    "Tell me what you need — orders, fulfillment, catalog, or approvals. I run ops; the store bot handles customers.",
  ].join("\n");
}
