import { createHash, randomUUID } from "node:crypto";
import {
  assertAllowedPool,
  sanitizeTradingMachinePool,
  validateTradingMachineSimulation,
} from "./policy";
import type {
  TradingMachineAgentPolicy,
  TradingMachineProposal,
  TradingMachineProposalStore,
  TradingMachineSimulation,
  TradingMachineUpstream,
} from "./types";

export class TradingMachineAdapter {
  constructor(
    private readonly upstream: TradingMachineUpstream,
    private readonly store: TradingMachineProposalStore,
  ) {}

  async health() {
    await this.upstream.health();
    return {
      status: "ok",
      authority: "watch-simulate-propose",
      execution: "disabled",
      upstream: "reachable",
    };
  }

  async listPools(policy: TradingMachineAgentPolicy) {
    const pools = await this.upstream.listPools();
    return pools
      .map(sanitizeTradingMachinePool)
      .filter((pool) => policy.allowedPoolIds.includes(pool.id));
  }

  async readPool(policy: TradingMachineAgentPolicy, poolId: string) {
    assertAllowedPool(policy, poolId);
    const [pool, price, swing] = await Promise.all([
      this.upstream.readPool(poolId),
      this.upstream.readPoolPrice(poolId).catch((error) => ({ error: error.message })),
      this.upstream.readPoolSwing(poolId).catch((error) => ({ error: error.message })),
    ]);
    return {
      pool: sanitizeTradingMachinePool(pool),
      price,
      swing: sanitizeSwingSnapshot(swing),
    };
  }

  simulate(policy: TradingMachineAgentPolicy, input: unknown): TradingMachineSimulation {
    const simulation = validateTradingMachineSimulation(policy, input);
    return {
      ...simulation,
      verdict: "proposal-eligible",
      execution: "disabled",
      generatedAt: Date.now(),
    };
  }

  propose({
    agentId,
    idempotencyKey,
    policy,
    input,
  }: {
    agentId: string;
    idempotencyKey: string;
    policy: TradingMachineAgentPolicy;
    input: unknown;
  }) {
    if (!idempotencyKey.trim() || idempotencyKey.length > 160) {
      throw new Error("A valid Idempotency-Key header is required.");
    }
    const simulation = this.simulate(policy, input);
    const fingerprint = stableHash({ agentId, simulation: withoutGeneratedAt(simulation) });
    const existing = this.store.findByIdempotencyKey(agentId, idempotencyKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new Error("Idempotency key already belongs to a different Trading Machine proposal.");
      }
      return existing;
    }
    const proposal: TradingMachineProposal = {
      ...simulation,
      id: `tm_${randomUUID()}`,
      agentId,
      idempotencyKey,
      status: "pending",
      fingerprint,
    };
    this.store.insert(proposal);
    return proposal;
  }

  readProposal(agentId: string, proposalId: string) {
    return this.store.findById(agentId, proposalId);
  }
}

function sanitizeSwingSnapshot(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const { state, bands, samples, poolId, error } = input as Record<string, unknown>;
  return { poolId, state, bands, samples, error };
}

function withoutGeneratedAt(simulation: TradingMachineSimulation) {
  const stable = { ...simulation };
  delete (stable as Partial<TradingMachineSimulation>).generatedAt;
  return stable;
}

function stableHash(input: unknown) {
  return createHash("sha256").update(canonicalJson(input)).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
