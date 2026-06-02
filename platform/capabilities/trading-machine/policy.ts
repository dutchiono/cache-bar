import type {
  TradingMachineAgentPolicy,
  TradingMachinePool,
  TradingMachinePoolType,
  TradingMachineSimulationInput,
} from "./types";

const poolTypes = new Set<TradingMachinePoolType>([
  "meteora-dbc",
  "meteora-damm",
  "pumpfun-bc",
  "pumpfun-amm",
  "raydium-v4",
  "raydium-cpmm",
]);

export function sanitizeTradingMachinePool(input: unknown): TradingMachinePool {
  const pool = objectValue(input, "pool");
  const strategy = optionalObjectValue(pool.strategy, "pool.strategy");
  const sequencer = objectValue(pool.sequencer, "pool.sequencer");
  const swing = objectValue(pool.swing, "pool.swing");
  const type = stringValue(pool.type, "pool.type", 40) as TradingMachinePoolType;
  if (!poolTypes.has(type)) throw new Error(`Unsupported Trading Machine pool type: ${type}.`);
  return {
    id: identifierValue(pool.id, "pool.id"),
    name: stringValue(pool.name, "pool.name", 160),
    type,
    poolAddress: stringValue(pool.pool_address, "pool.pool_address", 80),
    tokenMint: stringValue(pool.token_mint, "pool.token_mint", 80),
    active: Boolean(pool.active),
    watchGraduation: Boolean(pool.watch_graduation),
    strategy: strategy
      ? {
          budgetSolPerWallet: numberValue(strategy.budget_sol_per_wallet, "strategy.budget_sol_per_wallet", 0, 10_000),
          reserveSolPerWallet: numberValue(strategy.reserve_sol_per_wallet, "strategy.reserve_sol_per_wallet", 0, 10_000),
          slippageBps: numberValue(strategy.slippage_bps, "strategy.slippage_bps", 0, 10_000),
          stopLossPct:
            strategy.stop_loss_pct === null
              ? null
              : numberValue(strategy.stop_loss_pct, "strategy.stop_loss_pct", 0.01, 99.99),
        }
      : null,
    sequencer: {
      active: Boolean(sequencer.active),
      queueLength: Array.isArray(sequencer.queue) ? sequencer.queue.length : 0,
      action: stringValue(sequencer.action, "sequencer.action", 40),
      scheduleMode: stringValue(
        objectValue(sequencer.schedule, "sequencer.schedule").mode,
        "sequencer.schedule.mode",
        40,
      ),
    },
    swing: {
      active: Boolean(swing.active),
      sampleIntervalSec: numberValue(swing.sampleIntervalSec, "swing.sampleIntervalSec", 1, 86_400),
      lookbackMinutes: numberValue(swing.lookbackMinutes, "swing.lookbackMinutes", 1, 10_080),
      maxCycleSpendSol: numberValue(swing.maxCycleSpendSol, "swing.maxCycleSpendSol", 0, 10_000),
      slippageBps: numberValue(swing.slippageBps, "swing.slippageBps", 0, 10_000),
    },
  };
}

export function validateTradingMachineSimulation(
  policy: TradingMachineAgentPolicy,
  input: unknown,
): TradingMachineSimulationInput {
  const simulation = objectValue(input, "simulation");
  const poolId = identifierValue(simulation.poolId, "simulation.poolId");
  assertAllowedPool(policy, poolId);
  const side = simulation.side;
  if (side !== "buy" && side !== "sell") {
    throw new Error("simulation.side must be buy or sell.");
  }
  const slippageBps = numberValue(
    simulation.slippageBps,
    "simulation.slippageBps",
    1,
    policy.maxSlippageBps,
  );
  const rationale = stringValue(simulation.rationale, "simulation.rationale", 2_000);
  if (side === "buy") {
    return {
      poolId,
      side,
      amountSol: numberValue(simulation.amountSol, "simulation.amountSol", 0.000001, policy.maxProposalSol),
      slippageBps,
      rationale,
    };
  }
  return {
    poolId,
    side,
    sellPct: numberValue(simulation.sellPct, "simulation.sellPct", 0.01, 100),
    slippageBps,
    rationale,
  };
}

export function assertAllowedPool(policy: TradingMachineAgentPolicy, poolId: string) {
  if (!policy.allowedPoolIds.includes(poolId)) {
    throw new Error(`Pool is outside this agent's Trading Machine scope: ${poolId}.`);
  }
}

export function identifierValue(value: unknown, label: string) {
  const normalized = stringValue(value, label, 120);
  if (!/^[A-Za-z0-9._:-]+$/.test(normalized)) {
    throw new Error(`${label} contains unsupported characters.`);
  }
  return normalized;
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function optionalObjectValue(value: unknown, label: string) {
  return value === null || value === undefined ? null : objectValue(value, label);
}

function stringValue(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`${label} exceeds ${maxLength} characters.`);
  return normalized;
}

function numberValue(value: unknown, label: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
  return value;
}
