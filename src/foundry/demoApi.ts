import type { FoundryDemoCapability } from "../../platform/foundry/demoPolicy";

const DEFAULT_FOUNDRY_API_URL = "https://impartial-herring-497.convex.site";
const foundryApiUrl = (
  import.meta.env.VITE_FOUNDRY_API_URL?.trim() || DEFAULT_FOUNDRY_API_URL
).replace(/\/$/, "");

export type FoundryNetworkAgent = {
  publicId: string;
  slug: string;
  name: string;
  ticker: string;
  status: string;
  market: string;
  installedLead: string;
  computeBuffer: string;
  source: string;
};

export type FoundryDemoLaunch = FoundryNetworkAgent & {
  capabilities: FoundryDemoCapability[];
  runtimePath: string;
  createdAt: number;
};

export type FoundryDemoAuditEvent = {
  sequence: number;
  detail: string;
  at: number;
};

export async function readFoundryNetwork() {
  return await requestJson<{
    agents: FoundryNetworkAgent[];
    generatedAt: number;
    source: string;
  }>("/foundry/v1/network");
}

export async function createFoundryDemoLaunch(input: {
  name: string;
  ticker: string;
  capabilities: FoundryDemoCapability[];
  idempotencyKey: string;
}) {
  return await requestJson<{
    launch: FoundryDemoLaunch;
    auditEvents: FoundryDemoAuditEvent[];
  }>("/foundry/v1/demo/launch", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": input.idempotencyKey,
    },
    body: JSON.stringify({
      name: input.name,
      ticker: input.ticker,
      capabilities: input.capabilities,
    }),
  });
}

async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${foundryApiUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(6_000),
  });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Foundry API request failed with ${response.status}.`);
  }
  return body;
}
