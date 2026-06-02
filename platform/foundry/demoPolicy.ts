export const FOUNDRY_DEMO_PROVISIONING_STEPS = [
  "registering agent identity",
  "assigning Base inference wallet",
  "creating Solana capability wallet",
  "attaching Milady / elizaOS runtime",
  "installing capability manifests",
  "arming x402 bootstrap inference",
] as const;

export const FOUNDRY_DEMO_PUBLIC_CAPABILITIES = [
  "cachebar-commerce",
  "trading-machine",
] as const;

export const FOUNDRY_DEMO_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1_000;
export const FOUNDRY_DEMO_RATE_LIMIT_MAX_LAUNCHES = 5;
export const FOUNDRY_DEMO_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

export type FoundryDemoCapability = (typeof FOUNDRY_DEMO_PUBLIC_CAPABILITIES)[number];

export type FoundryDemoLaunchInput = {
  name: string;
  ticker: string;
  capabilities: FoundryDemoCapability[];
};

export function normalizeFoundryDemoLaunch(input: unknown): FoundryDemoLaunchInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Launch request must be a JSON object.");
  }
  const record = input as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim().replace(/\s+/g, " ") : "";
  const ticker = typeof record.ticker === "string" ? record.ticker.trim().toUpperCase() : "";
  if (name.length < 2 || name.length > 48) {
    throw new Error("Agent name must contain between 2 and 48 characters.");
  }
  if (!/^[A-Z][A-Z0-9]{1,7}$/.test(ticker)) {
    throw new Error("Ticker must contain 2 to 8 uppercase letters or numbers and start with a letter.");
  }
  if (!Array.isArray(record.capabilities)) {
    throw new Error("Capabilities must be an array.");
  }
  const capabilities = [...new Set(record.capabilities)];
  if (capabilities.length === 0) {
    throw new Error("Select at least one public launch capability.");
  }
  for (const capability of capabilities) {
    if (
      typeof capability !== "string" ||
      !FOUNDRY_DEMO_PUBLIC_CAPABILITIES.includes(capability as FoundryDemoCapability)
    ) {
      throw new Error(`Capability ${String(capability)} is not available for public launches.`);
    }
  }
  return {
    name,
    ticker,
    capabilities: capabilities as FoundryDemoCapability[],
  };
}

export function validateFoundryDemoIdempotencyKey(input: unknown) {
  const key = typeof input === "string" ? input.trim() : "";
  if (!/^[A-Za-z0-9._:-]{8,160}$/.test(key)) {
    throw new Error("A valid Idempotency-Key header is required.");
  }
  return key;
}

export function foundryDemoLaunchFingerprint(input: FoundryDemoLaunchInput) {
  return JSON.stringify({
    name: input.name,
    ticker: input.ticker,
    capabilities: [...input.capabilities].sort(),
  });
}

export function foundryDemoLaunchSlug(ticker: string, idempotencyKey: string) {
  const suffix = idempotencyKey.replace(/[^A-Za-z0-9]/g, "").slice(-8).toLowerCase();
  return `${ticker.toLowerCase()}-${suffix}`;
}

export function foundryDemoCapabilitySummary(capabilities: FoundryDemoCapability[]) {
  if (capabilities.includes("cachebar-commerce")) return "commerce";
  return "solana analysis";
}
