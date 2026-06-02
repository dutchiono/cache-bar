import { describe, expect, test } from "bun:test";
import {
  InferenceTreasuryOperator,
  InMemoryTreasuryJournalStore,
  type TreasuryExecutionClient,
  type TreasuryPortfolio,
  type TreasuryPortfolioClient,
} from "./inferenceTreasuryOperator";

const cycle = {
  cycleId: "agent-1:block-100",
  agentId: "1",
  inferenceWallet: "0x0000000000000000000000000000000000000004",
};

const policy = {
  x402UsdcBufferTarget: 5_000_000n,
  minimumSettlementConversion: 1_000n,
  minimumUsdcStakeConversion: 1_000_000n,
  minimumVvvStake: 1_000n,
  maximumUsdcStakeConversionPerCycle: 7_000_000n,
  vvvStakeTarget: 5_000n,
};

function createHarness(
  portfolios: TreasuryPortfolio[],
  options?: { failStakeOnce?: boolean },
) {
  const reads = [...portfolios];
  let latest = reads[reads.length - 1]!;
  let shouldFailStake = options?.failStakeOnce ?? false;
  const calls = {
    settlementToUsdc: [] as Array<{ amount: bigint; idempotencyKey: string }>,
    usdcToVvv: [] as Array<{ amount: bigint; idempotencyKey: string }>,
    stakeVvv: [] as Array<{ amount: bigint; idempotencyKey: string }>,
  };
  const portfolioClient: TreasuryPortfolioClient = {
    async read() {
      latest = reads.shift() ?? latest;
      return structuredClone(latest);
    },
  };
  const execution: TreasuryExecutionClient = {
    async ensureSettlementConvertedToUsdc({ amount, idempotencyKey }) {
      calls.settlementToUsdc.push({ amount, idempotencyKey });
    },
    async ensureUsdcConvertedToVvv({ amount, idempotencyKey }) {
      calls.usdcToVvv.push({ amount, idempotencyKey });
    },
    async ensureVvvStaked({ amount, idempotencyKey }) {
      calls.stakeVvv.push({ amount, idempotencyKey });
      if (shouldFailStake) {
        shouldFailStake = false;
        throw new Error("steward unavailable");
      }
    },
  };
  const journals = new InMemoryTreasuryJournalStore();
  const operator = new InferenceTreasuryOperator({
    journals,
    portfolios: portfolioClient,
    execution,
    policy,
  });

  return { operator, calls };
}

describe("InferenceTreasuryOperator", () => {
  test("converts settlement revenue but preserves the x402 bootstrap buffer", async () => {
    const { operator, calls } = createHarness([
      { settlementAmount: 10_000n, usdcAmount: 0n, unstakedVvvAmount: 0n, stakedVvvAmount: 0n },
      { settlementAmount: 0n, usdcAmount: 4_000_000n, unstakedVvvAmount: 0n, stakedVvvAmount: 0n },
    ]);

    const journal = await operator.reconcile(cycle);

    expect(journal.settlementConverted).toBe(10_000n);
    expect(journal.usdcConvertedToVvv).toBe(0n);
    expect(calls.settlementToUsdc).toEqual([
      { amount: 10_000n, idempotencyKey: "agent-1:block-100:settlement-to-usdc" },
    ]);
    expect(calls.usdcToVvv).toEqual([]);
  });

  test("stakes only the USDC surplus above the x402 buffer", async () => {
    const { operator, calls } = createHarness([
      { settlementAmount: 0n, usdcAmount: 12_000_000n, unstakedVvvAmount: 0n, stakedVvvAmount: 0n },
      { settlementAmount: 0n, usdcAmount: 5_000_000n, unstakedVvvAmount: 3_500n, stakedVvvAmount: 0n },
    ]);

    const journal = await operator.reconcile(cycle);

    expect(journal.usdcConvertedToVvv).toBe(7_000_000n);
    expect(journal.vvvStaked).toBe(3_500n);
    expect(calls.usdcToVvv[0]).toEqual({
      amount: 7_000_000n,
      idempotencyKey: "agent-1:block-100:usdc-to-vvv",
    });
    expect(calls.stakeVvv[0]).toEqual({
      amount: 3_500n,
      idempotencyKey: "agent-1:block-100:stake-vvv",
    });
  });

  test("does not execute a completed cycle twice", async () => {
    const { operator, calls } = createHarness([
      { settlementAmount: 0n, usdcAmount: 12_000_000n, unstakedVvvAmount: 0n, stakedVvvAmount: 0n },
      { settlementAmount: 0n, usdcAmount: 5_000_000n, unstakedVvvAmount: 3_500n, stakedVvvAmount: 0n },
      { settlementAmount: 0n, usdcAmount: 5_000_000n, unstakedVvvAmount: 0n, stakedVvvAmount: 3_500n },
    ]);

    await operator.reconcile(cycle);
    await operator.reconcile(cycle);

    expect(calls.usdcToVvv).toHaveLength(1);
    expect(calls.stakeVvv).toHaveLength(1);
  });

  test("retries staking without repeating the completed USDC swap", async () => {
    const { operator, calls } = createHarness(
      [
        { settlementAmount: 0n, usdcAmount: 12_000_000n, unstakedVvvAmount: 0n, stakedVvvAmount: 0n },
        { settlementAmount: 0n, usdcAmount: 5_000_000n, unstakedVvvAmount: 3_500n, stakedVvvAmount: 0n },
        { settlementAmount: 0n, usdcAmount: 5_000_000n, unstakedVvvAmount: 3_500n, stakedVvvAmount: 0n },
      ],
      { failStakeOnce: true },
    );

    await expect(operator.reconcile(cycle)).rejects.toThrow("steward unavailable");
    const journal = await operator.reconcile(cycle);

    expect(journal.vvvStaked).toBe(3_500n);
    expect(calls.usdcToVvv).toHaveLength(1);
    expect(calls.stakeVvv).toHaveLength(2);
  });

  test("does not compound VVV after the configured compute stake target is met", async () => {
    const { operator, calls } = createHarness([
      { settlementAmount: 0n, usdcAmount: 12_000_000n, unstakedVvvAmount: 0n, stakedVvvAmount: 5_000n },
    ]);

    await operator.reconcile(cycle);

    expect(calls.usdcToVvv).toEqual([]);
    expect(calls.stakeVvv).toEqual([]);
  });
});
