export type TradingMachinePoolType =
  | "meteora-dbc"
  | "meteora-damm"
  | "pumpfun-bc"
  | "pumpfun-amm"
  | "raydium-v4"
  | "raydium-cpmm";

export interface TradingMachineAgentPolicy {
  allowedPoolIds: string[];
  maxProposalSol: number;
  maxSlippageBps: number;
}

export interface TradingMachinePool {
  id: string;
  name: string;
  type: TradingMachinePoolType;
  poolAddress: string;
  tokenMint: string;
  active: boolean;
  watchGraduation: boolean;
  strategy: null | {
    budgetSolPerWallet: number;
    reserveSolPerWallet: number;
    slippageBps: number;
    stopLossPct: number | null;
  };
  sequencer: {
    active: boolean;
    queueLength: number;
    action: string;
    scheduleMode: string;
  };
  swing: {
    active: boolean;
    sampleIntervalSec: number;
    lookbackMinutes: number;
    maxCycleSpendSol: number;
    slippageBps: number;
  };
}

export interface TradingMachineSimulationInput {
  poolId: string;
  side: "buy" | "sell";
  amountSol?: number;
  sellPct?: number;
  slippageBps: number;
  rationale: string;
}

export interface TradingMachineSimulation {
  poolId: string;
  side: "buy" | "sell";
  amountSol?: number;
  sellPct?: number;
  slippageBps: number;
  rationale: string;
  verdict: "proposal-eligible";
  execution: "disabled";
  generatedAt: number;
}

export interface TradingMachineProposal extends TradingMachineSimulation {
  id: string;
  agentId: string;
  idempotencyKey: string;
  status: "pending";
  fingerprint: string;
}

export interface TradingMachineProposalStore {
  findByIdempotencyKey(agentId: string, idempotencyKey: string): TradingMachineProposal | null;
  findById(agentId: string, proposalId: string): TradingMachineProposal | null;
  insert(proposal: TradingMachineProposal): void;
}

export interface TradingMachineUpstream {
  health(): Promise<unknown>;
  listPools(): Promise<unknown[]>;
  readPool(poolId: string): Promise<unknown>;
  readPoolPrice(poolId: string): Promise<unknown>;
  readPoolSwing(poolId: string): Promise<unknown>;
}
