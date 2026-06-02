import { describe, expect, test } from "bun:test";
import { TradingMachineAdapter } from "./adapter";
import { createTradingMachineHttpHandler } from "./http";
import { MemoryTradingMachineProposalStore } from "./store";
import { HttpTradingMachineUpstream } from "./upstream";
import type { TradingMachineAgentPolicy, TradingMachineUpstream } from "./types";

const upstreamPool = {
  id: "cozy-pool",
  name: "Cozy Pool",
  type: "meteora-dbc",
  pool_address: "pool-address",
  token_mint: "token-mint",
  active: true,
  watch_graduation: true,
  strategy: {
    budget_sol_per_wallet: 1,
    reserve_sol_per_wallet: 0.1,
    slippage_bps: 100,
    stop_loss_pct: 35,
  },
  strategy_wallets: [{ walletName: "secret-wallet-name", mode: "accumulate" }],
  sequencer: {
    active: true,
    queue: [{ walletName: "secret-sequencer-wallet" }],
    action: "buy-sell",
    schedule: { mode: "manual" },
  },
  swing: {
    active: true,
    walletName: "secret-swing-wallet",
    sampleIntervalSec: 20,
    lookbackMinutes: 90,
    maxCycleSpendSol: 0.2,
    slippageBps: 250,
  },
  control_wallet_name: "secret-control-wallet",
};

const upstream: TradingMachineUpstream = {
  async health() { return { state: "unlocked", walletCount: 9 }; },
  async listPools() { return [upstreamPool, { ...upstreamPool, id: "other-pool" }]; },
  async readPool() { return upstreamPool; },
  async readPoolPrice() { return { priceSol: 0.00042 }; },
  async readPoolSwing() {
    return { poolId: "cozy-pool", bands: { action: "wait" }, state: { open: false }, samples: [] };
  },
};

const policy: TradingMachineAgentPolicy = {
  allowedPoolIds: ["cozy-pool"],
  maxProposalSol: 0.25,
  maxSlippageBps: 300,
};

describe("TradingMachineAdapter", () => {
  test("sanitizes pools and filters tenant scope", async () => {
    const adapter = new TradingMachineAdapter(upstream, new MemoryTradingMachineProposalStore());
    const pools = await adapter.listPools(policy);
    expect(pools).toHaveLength(1);
    expect(pools[0]).toMatchObject({
      id: "cozy-pool",
      sequencer: { queueLength: 1 },
      swing: { active: true },
    });
    expect(JSON.stringify(pools[0])).not.toContain("secret-");
  });

  test("creates idempotent proposals without any execution method", () => {
    const adapter = new TradingMachineAdapter(upstream, new MemoryTradingMachineProposalStore());
    const input = {
      poolId: "cozy-pool",
      side: "buy",
      amountSol: 0.1,
      slippageBps: 200,
      rationale: "Price dislocation merits operator review.",
    };
    const first = adapter.propose({ agentId: "afterimage", idempotencyKey: "proposal-1", policy, input });
    const replay = adapter.propose({ agentId: "afterimage", idempotencyKey: "proposal-1", policy, input });
    expect(replay.id).toBe(first.id);
    expect(first.execution).toBe("disabled");
    expect("execute" in adapter).toBe(false);
  });

  test("rejects pool, spend, and idempotency violations", () => {
    const adapter = new TradingMachineAdapter(upstream, new MemoryTradingMachineProposalStore());
    expect(() => adapter.simulate(policy, {
      poolId: "other-pool",
      side: "buy",
      amountSol: 0.1,
      slippageBps: 200,
      rationale: "Not in this tenant scope.",
    })).toThrow("outside this agent's Trading Machine scope");
    expect(() => adapter.simulate(policy, {
      poolId: "cozy-pool",
      side: "buy",
      amountSol: 0.5,
      slippageBps: 200,
      rationale: "Too much spend.",
    })).toThrow("simulation.amountSol");
  });

  test("serves authenticated read and proposal HTTP routes only", async () => {
    const adapter = new TradingMachineAdapter(upstream, new MemoryTradingMachineProposalStore());
    const handler = createTradingMachineHttpHandler(adapter, JSON.stringify({
      afterimage: { token: "afterimage-token", ...policy },
    }));
    const health = await handler(new Request("http://127.0.0.1/health"));
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({
      status: "ok",
      authority: "watch-simulate-propose",
      execution: "disabled",
      upstream: "reachable",
    });
    const denied = await handler(new Request("http://127.0.0.1/v1/pools"));
    expect(denied.status).toBe(401);
    const headers = {
      "x-foundry-agent-id": "afterimage",
      authorization: "Bearer afterimage-token",
      "content-type": "application/json",
    };
    const pools = await handler(new Request("http://127.0.0.1/v1/pools", { headers }));
    expect(pools.status).toBe(200);
    const execute = await handler(new Request("http://127.0.0.1/v1/execute", {
      method: "POST",
      headers,
      body: "{}",
    }));
    expect(execute.status).toBe(404);
  });

  test("reports degraded health without leaking upstream errors", async () => {
    const failingUpstream: TradingMachineUpstream = {
      ...upstream,
      async health() { throw new Error("wallet vault internal details"); },
    };
    const handler = createTradingMachineHttpHandler(
      new TradingMachineAdapter(failingUpstream, new MemoryTradingMachineProposalStore()),
      undefined,
    );
    const health = await handler(new Request("http://127.0.0.1/health"));
    expect(health.status).toBe(503);
    expect(await health.json()).toEqual({
      status: "degraded",
      authority: "watch-simulate-propose",
      execution: "disabled",
      upstream: "unreachable",
    });
  });

  test("refuses non-loopback upstream URLs", () => {
    expect(() => new HttpTradingMachineUpstream("https://trading.example.com")).toThrow(
      "must remain an HTTP loopback URL",
    );
  });
});
