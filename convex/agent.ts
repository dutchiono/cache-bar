import { ActionCache } from "@convex-dev/action-cache";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { rateLimiter } from "./componentLimits";
import { recordConciergeMessageMetric } from "./componentMetrics";
import { createCustomProduct, teemillConfig } from "./lib/teemill";
import { telegramBotConfigured } from "./lib/telegramApi";
import { requireUser } from "./model/auth";

const conciergeSource = v.union(
  v.literal("web"),
  v.literal("discord"),
  v.literal("telegram"),
  v.literal("waifu"),
);

type ElizaReply = {
  content: string;
  configured: boolean;
  provider: "eliza" | "cache";
  mode: "process" | "ingest" | "fallback";
};

type PublicConciergeResult = ElizaReply & {
  sessionId: Id<"conciergeSessions">;
  visitorId: string;
};

type ElizaConfigStatus = {
  elizaConfigured: boolean;
  elizaBaseUrl?: string;
  elizaAgentId?: string;
  elizaChannelId?: string;
  discordConfigured: boolean;
  telegramStoreConfigured: boolean;
  telegramManagerConfigured: boolean;
  /** @deprecated use telegramStoreConfigured */
  telegramConfigured: boolean;
  mode: "process" | "ingest" | "auto";
  synchronousResponses: boolean;
  processEndpoint: string;
  ingestEndpoint: string;
  webConciergeEnabled: boolean;
};

const elizaConfigCache: ActionCache<typeof internal.agent.readElizaConfigStatus> = new ActionCache(components.actionCache, {
  action: internal.agent.readElizaConfigStatus,
  name: "eliza-config-status-v1",
  ttl: 30_000,
});

export const listThreads = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const threads = await ctx.db
      .query("agentThreads")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return threads.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getThread = query({
  args: { id: v.id("agentThreads") },
  handler: async (ctx, { id }) => {
    const user = await requireUser(ctx);
    const thread = await ctx.db.get(id);
    if (!thread) return null;
    if (thread.userId !== user._id && !["admin", "support"].includes(user.role)) {
      throw new Error("Forbidden.");
    }
    const messages = await ctx.db
      .query("agentMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", id))
      .collect();
    return {
      thread,
      messages: messages.sort((a, b) => a._creationTime - b._creationTime),
    };
  },
});

export const createThread = mutation({
  args: {
    surface: v.string(),
    contextRef: v.optional(v.string()),
  },
  handler: async (ctx, { surface, contextRef }) => {
    const user = await requireUser(ctx);
    if (!surface.trim()) throw new Error("Surface is required.");
    return await ctx.db.insert("agentThreads", {
      userId: user._id,
      surface: surface.trim(),
      contextRef: contextRef?.trim() || undefined,
    });
  },
});

export const postMessage = mutation({
  args: {
    threadId: v.id("agentThreads"),
    content: v.string(),
  },
  handler: async (ctx, { threadId, content }) => {
    const user = await requireUser(ctx);
    const thread = await ctx.db.get(threadId);
    if (!thread) throw new Error("Thread not found.");
    if (thread.userId !== user._id && !["admin", "support"].includes(user.role)) {
      throw new Error("Forbidden.");
    }
    const body = content.trim();
    if (!body) throw new Error("Message is required.");

    await ctx.db.insert("agentMessages", {
      threadId,
      role: "user",
      content: body,
    });

    const response = fallbackReply(body);
    await ctx.db.insert("agentMessages", {
      threadId,
      role: "assistant",
      content: response,
    });
    await ctx.db.insert("agentRuns", {
      mode: "copilot",
      userId: user._id,
      summary: response,
      toolCalls: [{ tool: "cache_fallback", detail: "Eliza action proxy was not used." }],
    });

    return response;
  },
});

export const chat = action({
  args: {
    threadId: v.id("agentThreads"),
    content: v.string(),
  },
  handler: async (ctx, { threadId, content }) => {
    const body = content.trim();
    if (!body) throw new Error("Message is required.");

    const auth = await ctx.runQuery(internal.agent.authorizeThreadForChat, { threadId });
    await rateLimiter.limit(ctx, "authSensitiveMutation", {
      key: String(auth.userId),
      throws: true,
    });
    await rateLimiter.limit(ctx, "elizaProxyRequest", { throws: true });
    await ctx.runMutation(internal.agent.recordThreadMessage, {
      threadId,
      role: "user",
      content: body,
    });

    const reply = await askEliza({
      text: body,
      source: "web",
      entityId: String(auth.userId),
      roomId: config().channelId ?? String(threadId),
      metadata: {
        surface: auth.surface,
        contextRef: auth.contextRef,
        role: auth.role,
      },
    });

    await ctx.runMutation(internal.agent.recordThreadMessage, {
      threadId,
      role: "assistant",
      content: reply.content,
    });
    await ctx.runMutation(internal.agent.recordAgentRun, {
      userId: auth.userId,
      summary: reply.content,
      provider: reply.provider,
    });

    return reply;
  },
});

export const publicConciergeChat = action({
  args: {
    visitorId: v.optional(v.string()),
    content: v.string(),
    currentPath: v.optional(v.string()),
    waifuAgentId: v.optional(v.string()),
    imageDataUrl: v.optional(v.string()),
    imageName: v.optional(v.string()),
  },
  handler: async (ctx, { visitorId, content, currentPath, waifuAgentId, imageDataUrl, imageName }): Promise<PublicConciergeResult> => {
    const body = content.trim();
    const normalizedImageDataUrl = imageDataUrl?.trim() || undefined;
    if (!body && !normalizedImageDataUrl) throw new Error("Message or image is required.");

    const stableVisitorId = visitorId?.trim() || `web-${crypto.randomUUID()}`;
    await rateLimiter.limit(ctx, "publicConciergeMessage", {
      key: stableVisitorId,
      throws: true,
    });
    await rateLimiter.limit(ctx, "globalConciergeMessage", { throws: true });
    await rateLimiter.limit(ctx, "elizaProxyRequest", { throws: true });

    const sessionId = await ctx.runMutation(internal.agent.upsertConciergeSession, {
      visitorId: stableVisitorId,
      source: "web",
      sourceRef: currentPath,
      waifuAgentId: waifuAgentId?.trim() || undefined,
    }) as Id<"conciergeSessions">;

    await ctx.runMutation(internal.agent.recordConciergeMessage, {
      sessionId,
      role: "user",
      content: body || `[image] ${imageName?.trim() || "custom shirt request"}`,
      metadata: {
        currentPath,
        imageAttached: Boolean(normalizedImageDataUrl),
        imageName: imageName?.trim() || undefined,
      },
    });

    const reply = normalizedImageDataUrl
      ? await handleCustomProductRequest({
          text: body,
          imageDataUrl: normalizedImageDataUrl,
          imageName: imageName?.trim() || undefined,
        })
      : isPartnerAgentModelQuestion(body)
        ? {
            content: partnerAgentModelReply(),
            configured: true,
            provider: "cache" as const,
            mode: "fallback" as const,
          }
        : isStickerDemoIntent(body)
          ? {
              content: stickerDemoReply(),
              configured: true,
              provider: "cache" as const,
              mode: "fallback" as const,
            }
          : await askEliza({
              text: body,
              source: "web",
              entityId: stableVisitorId,
              roomId: config().channelId ?? String(sessionId),
              metadata: {
                currentPath,
                waifuAgentId,
                product: "cache_concierge",
              },
            });

    await ctx.runMutation(internal.agent.recordConciergeMessage, {
      sessionId,
      role: "assistant",
      content: reply.content,
      metadata: { provider: reply.provider, configured: reply.configured },
    });

    return {
      ...reply,
      sessionId,
      visitorId: stableVisitorId,
    };
  },
});

export const configStatus = action({
  args: {},
  handler: async (ctx): Promise<ElizaConfigStatus> => {
    return await elizaConfigCache.fetch(ctx, {});
  },
});

export const readElizaConfigStatus = internalAction({
  args: {},
  handler: async (): Promise<ElizaConfigStatus> => {
    const c = config();
    return {
      elizaConfigured: Boolean(c.baseUrl && c.agentId),
      elizaBaseUrl: c.baseUrl,
      elizaAgentId: c.agentId,
      elizaChannelId: c.channelId,
      discordConfigured: Boolean(envValue("DISCORD_APPLICATION_ID") && envValue("DISCORD_API_TOKEN")),
      telegramStoreConfigured: telegramBotConfigured("store"),
      telegramManagerConfigured: telegramBotConfigured("manager"),
      telegramConfigured: telegramBotConfigured("store"),
      mode: c.mode,
      synchronousResponses: c.mode !== "ingest",
      processEndpoint: "/api/messaging/external-messages",
      ingestEndpoint: "/api/messaging/ingest-external",
      webConciergeEnabled: true,
    };
  },
});

export const authorizeThreadForChat = internalQuery({
  args: { threadId: v.id("agentThreads") },
  handler: async (ctx, { threadId }) => {
    const user = await requireUser(ctx);
    const thread = await ctx.db.get(threadId);
    if (!thread) throw new Error("Thread not found.");
    if (thread.userId !== user._id && !["admin", "support"].includes(user.role)) {
      throw new Error("Forbidden.");
    }
    return {
      userId: user._id,
      role: user.role,
      surface: thread.surface,
      contextRef: thread.contextRef,
    };
  },
});

export const recordThreadMessage = internalMutation({
  args: {
    threadId: v.id("agentThreads"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("tool")),
    content: v.string(),
  },
  handler: async (ctx, { threadId, role, content }) => {
    await ctx.db.insert("agentMessages", {
      threadId,
      role,
      content,
    });
  },
});

export const recordAgentRun = internalMutation({
  args: {
    userId: v.id("users"),
    summary: v.string(),
    provider: v.string(),
  },
  handler: async (ctx, { userId, summary, provider }) => {
    await ctx.db.insert("agentRuns", {
      mode: "copilot",
      userId,
      summary,
      toolCalls: [{ tool: provider, detail: "cache concierge chat" }],
    });
  },
});

export const upsertConciergeSession = internalMutation({
  args: {
    visitorId: v.string(),
    source: conciergeSource,
    sourceRef: v.optional(v.string()),
    waifuAgentId: v.optional(v.string()),
  },
  handler: async (ctx, { visitorId, source, sourceRef, waifuAgentId }): Promise<Id<"conciergeSessions">> => {
    const existing = await ctx.db
      .query("conciergeSessions")
      .withIndex("by_visitor", (q) => q.eq("visitorId", visitorId))
      .first();
    const lastMessageAt = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        source,
        sourceRef,
        waifuAgentId,
        lastMessageAt,
      });
      return existing._id;
    }
    return await ctx.db.insert("conciergeSessions", {
      visitorId,
      source,
      sourceRef,
      waifuAgentId,
      lastMessageAt,
    });
  },
});

export const recordConciergeMessage = internalMutation({
  args: {
    sessionId: v.id("conciergeSessions"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("tool")),
    content: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("conciergeMessages", args);
    const message = await ctx.db.get(messageId);
    if (message) {
      await recordConciergeMessageMetric(ctx, message);
    }
    await ctx.db.patch(args.sessionId, { lastMessageAt: Date.now() });
  },
});

async function askEliza({
  text,
  source,
  entityId,
  roomId,
  metadata,
}: {
  text: string;
  source: "web" | "discord" | "telegram" | "waifu";
  entityId: string;
  roomId: string;
  metadata: Record<string, unknown>;
}): Promise<ElizaReply> {
  const c = config();
  if (!c.baseUrl || !c.agentId) {
    return {
      content: fallbackReply(text),
      configured: false,
      provider: "cache",
      mode: "fallback",
    };
  }

  if (c.mode !== "ingest") {
    const processed = await processExternalMessage({
      baseUrl: c.baseUrl,
      apiKey: c.apiKey,
      text,
      source,
      entityId,
      roomId,
      metadata,
    });
    if (processed) {
      return {
        content: processed,
        configured: true,
        provider: "eliza",
        mode: "process",
      };
    }
    if (c.mode === "process") {
      throw new Error("Eliza Cloud did not return a message response from the process endpoint.");
    }
  }

  await ingestExternalMessage({
    baseUrl: c.baseUrl,
    apiKey: c.apiKey,
    agentId: c.agentId,
    text,
    source,
    entityId,
    roomId,
    metadata,
  });

  return {
    content:
      "I sent that to .cache's Eliza runtime. If this is a shop request, I will turn it into draft catalog, .stash, fulfillment, or ops proposals for human approval.",
    configured: true,
    provider: "eliza",
    mode: "ingest",
  };
}

async function handleCustomProductRequest({
  text,
  imageDataUrl,
  imageName,
}: {
  text: string;
  imageDataUrl: string;
  imageName?: string;
}): Promise<ElizaReply> {
  if (!teemillConfig().customProductConfigured) {
    return {
      content:
        "I can see the image, but Teemill custom-product mode is not configured yet. Add `TEEMILL_PUBLIC_SAFE_KEY` to enable one-off shirt creation.",
      configured: false,
      provider: "cache",
      mode: "fallback",
    };
  }

  const productName = deriveCustomProductName(text, imageName);
  const result = await createCustomProduct({
    imageUrl: imageDataUrl,
    itemCode: "RNA1",
    name: productName,
    colours: "White,Black",
    description: "Created through the .cache concierge Teemill custom-product flow.",
  });

  return {
    content: `I turned that image into a Teemill shirt draft. Buy it here: ${result.url}`,
    configured: true,
    provider: "cache",
    mode: "fallback",
  };
}

async function processExternalMessage({
  baseUrl,
  apiKey,
  text,
  source,
  entityId,
  roomId,
  metadata,
}: {
  baseUrl: string;
  apiKey?: string;
  text: string;
  source: "web" | "discord" | "telegram" | "waifu";
  entityId: string;
  roomId: string;
  metadata: Record<string, unknown>;
}) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/messaging/external-messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      platform: source === "telegram" ? "telegram" : "discord",
      messageId: `cache-${Date.now()}-${crypto.randomUUID()}`,
      channelId: roomId,
      userId: entityId,
      content: text,
      attachments: [],
      metadata: {
        ...metadata,
        source,
      },
    }),
  });

  if (response.status === 404 || response.status === 405 || response.status === 501) {
    return null;
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Eliza Cloud process request failed (${response.status}). ${detail}`.trim());
  }

  const body = await response.json();
  const candidate = body?.data?.response ?? body?.response ?? body?.message;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

async function ingestExternalMessage({
  baseUrl,
  apiKey,
  agentId,
  text,
  source,
  entityId,
  roomId,
  metadata,
}: {
  baseUrl: string;
  apiKey?: string;
  agentId: string;
  text: string;
  source: "web" | "discord" | "telegram" | "waifu";
  entityId: string;
  roomId: string;
  metadata: Record<string, unknown>;
}) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/messaging/ingest-external`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      agentId,
      roomId,
      userId: entityId,
      text,
      sourceId: entityId,
      sourceType: source === "telegram" ? "telegram" : "discord",
      metadata,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Eliza Cloud request failed (${response.status}). ${detail}`.trim());
  }
}

function fallbackReply(content: string) {
  const lower = content.toLowerCase();
  if (isPartnerAgentPitchRequest(content)) {
    return partnerAgentPitchReply();
  }
  if (isPartnerAgentModelQuestion(content)) {
    return partnerAgentModelReply();
  }
  if (isStickerDemoIntent(content)) {
    return stickerDemoReply();
  }
  if (lower.includes("shop") || lower.includes("store") || lower.includes("drop")) {
    return "I can help a waifu open a shop: decide whether the buyer needs a custom Teemill product link or the .cache Stripe catalog flow, define the drop, attach a token discount through .stash, and route Prodigi or Teemill fulfillment for approval.";
  }
  if (
    lower.includes("custom shirt") ||
    lower.includes("design a shirt") ||
    lower.includes("generate shirt") ||
    lower.includes("one-off shirt") ||
    lower.includes("personalized shirt")
  ) {
    return "For Teemill, I can route two paths: custom-product mode for one-off generated shirts that use Teemill checkout, or catalog/orders mode for prebuilt products that stay in the .cache Stripe flow.";
  }
  if (lower.includes("stash") || lower.includes("token") || lower.includes("burn")) {
    return ".stash connects a waifu token to a Stripe discount code. The holder burns the configured token amount, cache verifies the burn, then issues a one-time checkout code.";
  }
  if (lower.includes("discord") || lower.includes("telegram")) {
    return "The web concierge is wired here. Discord and Telegram should run through the same .cache Eliza agent once the bot tokens are added to the Eliza Cloud deployment.";
  }
  if (lower.includes("refund") || lower.includes("order")) {
    return "I can help with order lookup, Stripe refund prep, fulfillment status, and customer support. Prodigi handles the active sticker POD run after approval; Teemill remains available for one-off shirt flows. Money-moving actions still need an operator approval path.";
  }
  if (lower.includes("sticker") || lower.includes("pod") || lower.includes("prodigi")) {
    return "The active sticker run uses Prodigi for proof, quote, and fulfillment. Price stays TBD until artwork proof, Prodigi quote, shipping, and margin are approved. I can help inspect mapped SKUs and prepare quotes, but live Prodigi orders still need ops approval.";
  }
  return "Tell me what the waifu wants to sell, whether the request is a one-off custom shirt or a catalog product, what token should unlock the discount, and whether fulfillment is Prodigi print-on-demand, Teemill, dropship, supplier, or digital.";
}

function isPartnerAgentModelQuestion(content: string) {
  const lower = content.toLowerCase();
  return (
    (lower.includes("dtour") && (lower.includes("how") || lower.includes("plug") || lower.includes("offer"))) ||
    (lower.includes("partner agent") && (lower.includes("how") || lower.includes("work") || lower.includes("promo"))) ||
    (lower.includes("any agent") && (lower.includes("shop") || lower.includes("sell") || lower.includes("offer"))) ||
    (lower.includes("agent shop") && (lower.includes("how") || lower.includes("work"))) ||
    lower.includes("offer it as a promo") ||
    lower.includes("plug in and offer") ||
    lower.includes("how does this work for another agent")
  );
}

function isPartnerAgentPitchRequest(content: string) {
  const lower = content.toLowerCase();
  return (
    (lower.includes("dtour") && (lower.includes("tell") || lower.includes("send") || lower.includes("pitch"))) ||
    (lower.includes("owner") && lower.includes("dtour")) ||
    lower.includes("what do i tell my friend") ||
    lower.includes("what do i tell dtour") ||
    lower.includes("message to dtour") ||
    lower.includes("copy for dtour")
  );
}

function isStickerDemoIntent(content: string) {
  const lower = content.toLowerCase();
  return (
    lower.includes("what do you have for sale") ||
    lower.includes("what's for sale") ||
    lower.includes("whats for sale") ||
    lower.includes("what are you selling") ||
    lower.includes("what can i buy") ||
    lower.includes("pre-pre sale") ||
    lower.includes("dto ur") ||
    lower.includes("dtour") ||
    lower.includes("promo") ||
    lower.includes("agent shop") ||
    lower.includes("sticker")
  );
}

function stickerDemoReply() {
  return [
    "Right now .cache is running the sticker pre-pre sale demo.",
    "Offer: one Cozy Devs Sticker Pack containing Moon Seal, Floppy, and Bus Riot.",
    "There are 50 packs total, and each buyer should get the sticker-pack proof NFT.",
    "Stripe and connected-wallet Base ETH, Base USDC, Solana SOL, and Solana USDC checkout all draw from that same shared inventory.",
    "x402 is the agent/API path once a production facilitator is configured.",
    "The same pack can be fronted by .cache directly or by a partner agent like DTOUR.",
    "That is the point of the demo: one real product, reusable by any agent that wants a shop.",
    "If you want in, say `claim a sticker pack` and I will route you to the right payment path.",
  ].join(" ");
}

function partnerAgentModelReply() {
  return [
    "The sticker pack demo is one real product owned by .cache, not a separate product per agent.",
    ".cache keeps the SKU, inventory, payment-lane caps, checkout state, and mailing export.",
    "DTOUR or any other partner agent supplies the audience and promo framing, then points buyers into the same product flow.",
    "For the live run that means one 50-pack inventory pool, and Stripe plus connected-wallet Base and Solana payments all draw from that same inventory instead of waiting on separate caps.",
    "That is the reusable pattern: the agent is the sales front, .cache is the commerce backend.",
  ].join(" ");
}

function partnerAgentPitchReply() {
  return [
    "Send this to the DTOUR owner:",
    "`I am offering one real sticker pack plus a proof NFT through .cache and I want DTOUR to be allowed to offer the same pack as a promo. DTOUR does not need its own SKU, inventory, or checkout stack. It plugs into the existing .cache product, uses Stripe or connected-wallet Base and Solana payments against the same shared inventory, and .cache keeps the order record and fulfillment flow.`",
    "That same arrangement is the general pattern for any agent shop: the agent fronts the product, .cache runs the commerce backend.",
  ].join(" ");
}

function deriveCustomProductName(text: string, imageName?: string) {
  const trimmedText = text.trim();
  if (trimmedText) {
    return trimmedText.slice(0, 80);
  }
  if (imageName?.trim()) {
    return imageName.trim().replace(/\.[A-Za-z0-9]+$/, "").slice(0, 80);
  }
  return ".cache custom tee";
}

function config() {
  return {
    baseUrl: envValue("CACHE_ELIZA_BASE_URL") ?? envValue("ELIZA_BASE_URL") ?? envValue("ELIZA_API_URL"),
    apiKey: envValue("CACHE_ELIZA_API_KEY") ?? envValue("ELIZA_API_KEY"),
    agentId: envValue("CACHE_ELIZA_AGENT_ID") ?? envValue("ELIZA_AGENT_ID"),
    channelId: envValue("CACHE_ELIZA_CHANNEL_ID") ?? envValue("ELIZA_CHANNEL_ID"),
    mode: elizaMode(),
  };
}

function elizaMode(): "process" | "ingest" | "auto" {
  const raw = envValue("CACHE_ELIZA_MODE") ?? envValue("ELIZA_MODE") ?? "auto";
  return raw === "process" || raw === "ingest" ? raw : "auto";
}

function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const value = globalProcess.process?.env?.[key]?.trim();
  return value || undefined;
}
