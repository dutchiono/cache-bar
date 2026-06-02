import { TradingMachineAdapter } from "./adapter";
import type { TradingMachineAgentPolicy } from "./types";

interface TradingMachineAgentConfig extends TradingMachineAgentPolicy {
  token: string;
}

export function createTradingMachineHttpHandler(
  adapter: TradingMachineAdapter,
  rawAgentConfig: string | undefined,
) {
  const agents = readAgentConfig(rawAgentConfig);
  return async function handle(request: Request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      try {
        return jsonResponse(await adapter.health());
      } catch {
        return jsonResponse({
          status: "degraded",
          authority: "watch-simulate-propose",
          execution: "disabled",
          upstream: "unreachable",
        }, 503);
      }
    }
    try {
      const { agentId, policy } = authorize(request, agents);
      if (request.method === "GET" && url.pathname === "/v1/pools") {
        return jsonResponse({ pools: await adapter.listPools(policy) });
      }
      const poolMatch = url.pathname.match(/^\/v1\/pools\/([^/]+)$/);
      if (request.method === "GET" && poolMatch) {
        return jsonResponse(await adapter.readPool(policy, decodeURIComponent(poolMatch[1]!)));
      }
      if (request.method === "POST" && url.pathname === "/v1/simulations") {
        return jsonResponse({ simulation: adapter.simulate(policy, await request.json()) });
      }
      if (request.method === "POST" && url.pathname === "/v1/proposals") {
        const proposal = adapter.propose({
          agentId,
          policy,
          idempotencyKey: request.headers.get("idempotency-key") ?? "",
          input: await request.json(),
        });
        return jsonResponse({ proposal }, 202);
      }
      const proposalMatch = url.pathname.match(/^\/v1\/proposals\/([^/]+)$/);
      if (request.method === "GET" && proposalMatch) {
        const proposal = adapter.readProposal(agentId, decodeURIComponent(proposalMatch[1]!));
        return proposal ? jsonResponse({ proposal }) : jsonResponse({ error: "Proposal not found." }, 404);
      }
      return jsonResponse({ error: "Route not found." }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Trading Machine adapter request failed.";
      const status = message.includes("credentials") ? 401 : message.includes("Idempotency key") ? 409 : 400;
      return jsonResponse({ error: message }, status);
    }
  };
}

function readAgentConfig(raw: string | undefined): Record<string, TradingMachineAgentConfig> {
  if (!raw) return {};
  const config = JSON.parse(raw) as unknown;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("TRADING_MACHINE_ADAPTER_AGENTS must be a JSON object.");
  }
  return config as Record<string, TradingMachineAgentConfig>;
}

function authorize(request: Request, agents: Record<string, TradingMachineAgentConfig>) {
  const agentId = request.headers.get("x-foundry-agent-id")?.trim();
  const bearer = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
  const config = agentId ? agents[agentId] : undefined;
  if (!agentId || !bearer || !config || config.token !== bearer) {
    throw new Error("Invalid Trading Machine adapter credentials.");
  }
  return {
    agentId,
    policy: {
      allowedPoolIds: config.allowedPoolIds,
      maxProposalSol: config.maxProposalSol,
      maxSlippageBps: config.maxSlippageBps,
    },
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
