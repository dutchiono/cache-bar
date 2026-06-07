export type ElizaSource = "web" | "discord" | "telegram" | "waifu";
export type ElizaSurface = "store" | "manager" | "web" | "ops";

export type ElizaAgentReply = {
  content: string;
  configured: boolean;
  provider: "eliza" | "cache";
  mode: "process" | "ingest" | "fallback";
};

export type AskElizaAgentInput = {
  text: string;
  source: ElizaSource;
  surface: ElizaSurface;
  entityId: string;
  roomId?: string;
  metadata?: Record<string, unknown>;
  /** Prepended to the user message (e.g. live ops snapshot for manager). */
  contextPrefix?: string;
};

export function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const value = globalProcess.process?.env?.[key]?.trim();
  return value || undefined;
}

export function elizaConfig() {
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

function elizaPlatform(source: ElizaSource) {
  if (source === "telegram") return "telegram";
  if (source === "discord") return "discord";
  return "discord";
}

function elizaSourceType(source: ElizaSource) {
  if (source === "telegram") return "telegram";
  if (source === "discord") return "discord";
  return "discord";
}

function defaultRoomId(c: ReturnType<typeof elizaConfig>, input: AskElizaAgentInput) {
  const base = c.channelId ?? "cache";
  return input.roomId ?? `${base}-${input.surface}-${input.entityId}`;
}

/** Route through the deployed dotCache Eliza agent (messaging API), not raw chat/completions. */
export async function askElizaAgent(input: AskElizaAgentInput): Promise<ElizaAgentReply> {
  const c = elizaConfig();
  if (!c.baseUrl || !c.agentId) {
    return { content: "", configured: false, provider: "cache", mode: "fallback" };
  }

  const text = input.contextPrefix ? `${input.contextPrefix}\n\n${input.text}` : input.text;
  const roomId = defaultRoomId(c, input);
  const metadata = {
    ...input.metadata,
    source: input.source,
    surface: input.surface,
    agentId: c.agentId,
  };

  try {
    if (c.mode !== "ingest") {
      const processed = await processExternalMessage({
        baseUrl: c.baseUrl,
        apiKey: c.apiKey,
        agentId: c.agentId,
        text,
        source: input.source,
        entityId: input.entityId,
        roomId,
        metadata,
      });
      if (processed) {
        return { content: processed, configured: true, provider: "eliza", mode: "process" };
      }
      if (c.mode === "process") {
        return { content: "", configured: false, provider: "cache", mode: "fallback" };
      }
    }

    await ingestExternalMessage({
      baseUrl: c.baseUrl,
      apiKey: c.apiKey,
      agentId: c.agentId,
      text,
      source: input.source,
      entityId: input.entityId,
      roomId,
      metadata,
    });

    return {
      content:
        "Message received by dotCache on Eliza Cloud. I will follow up with catalog or fulfillment proposals for your approval.",
      configured: true,
      provider: "eliza",
      mode: "ingest",
    };
  } catch (error) {
    console.error("askElizaAgent failed", error);
    return { content: "", configured: false, provider: "cache", mode: "fallback" };
  }
}

async function processExternalMessage({
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
  source: ElizaSource;
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
      platform: elizaPlatform(source),
      messageId: `cache-${Date.now()}-${crypto.randomUUID()}`,
      channelId: roomId,
      userId: entityId,
      content: text,
      attachments: [],
      metadata: {
        ...metadata,
        agentId,
      },
    }),
  });

  if (response.status === 404 || response.status === 405 || response.status === 501) {
    return null;
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Eliza process failed (${response.status}). ${detail}`.trim());
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
  source: ElizaSource;
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
      sourceType: elizaSourceType(source),
      metadata,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Eliza ingest failed (${response.status}). ${detail}`.trim());
  }
}
