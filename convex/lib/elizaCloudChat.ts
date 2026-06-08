import { askElizaAgent } from "./elizaAgent";
import { managerConversationalReply } from "./managerConcierge";
import { formatOpsContext, type OpsSnapshot } from "./opsSnapshot";
import { shopAgentContext, shopConversationalReply } from "./shopConcierge";
import type { TelegramBotRole } from "./telegramApi";

export type AskDotCacheInput = {
  text: string;
  surface: "store" | "manager" | "web" | "ops";
  entityId: string;
  roomId?: string;
  opsSnap?: OpsSnapshot;
  metadata?: Record<string, unknown>;
};

/** Single dotCache agent entry — Eliza messaging API first, local fallback second. */
export async function askDotCache(input: AskDotCacheInput): Promise<string> {
  const source =
    input.surface === "store" || input.surface === "manager" ? "telegram" : "web";
  const contextPrefix =
    input.surface === "manager" && input.opsSnap ? formatOpsContext(input.opsSnap) : undefined;

  const shopContext =
    input.surface === "store" || input.surface === "web" ? shopAgentContext() : undefined;
  const mergedContext = [contextPrefix, shopContext].filter(Boolean).join("\n\n") || undefined;

  const reply = await askElizaAgent({
    text: input.text,
    source,
    surface: input.surface,
    entityId: input.entityId,
    roomId: input.roomId,
    contextPrefix: mergedContext,
    metadata: input.metadata,
  });

  if (reply.configured && reply.content) {
    if (
      reply.mode === "ingest" &&
      (input.surface === "store" || input.surface === "web")
    ) {
      return shopConversationalReply(input.text, {
        channel: input.surface === "web" ? "web" : "telegram",
      });
    }
    return reply.content;
  }

  if (input.surface === "manager" && input.opsSnap) {
    return managerConversationalReply(input.text, input.opsSnap);
  }
  if (input.surface === "store") {
    return shopConversationalReply(input.text, { channel: "telegram" });
  }
  if (input.surface === "web") {
    return shopConversationalReply(input.text, { channel: "web" });
  }
  return reply.content;
}

/** @deprecated Use askDotCache — kept for telegram import sites. */
export async function elizaCloudChat(
  userText: string,
  role: TelegramBotRole = "store",
  opsSnap?: OpsSnapshot,
  chatId?: number,
): Promise<string> {
  const surface = role === "manager" ? "manager" : "store";
  const entityId = chatId !== undefined ? `tg-${role}-${chatId}` : `tg-${role}-unknown`;
  return askDotCache({
    text: userText,
    surface,
    entityId,
    opsSnap,
    metadata: { telegramBot: role },
  });
}
