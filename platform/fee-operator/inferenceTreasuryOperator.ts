export type TreasuryPortfolio = {
  settlementAmount: bigint;
  usdcAmount: bigint;
  unstakedVvvAmount: bigint;
};

export type TreasuryCycle = {
  cycleId: string;
  agentId: string;
  inferenceWallet: string;
};

export type TreasuryJournal = TreasuryCycle & {
  completedSteps: string[];
  settlementConverted: bigint;
  usdcConvertedToVvv: bigint;
  vvvStaked: bigint;
};

export type TreasuryPolicy = {
  x402UsdcBufferTarget: bigint;
  minimumSettlementConversion: bigint;
  minimumUsdcStakeConversion: bigint;
  minimumVvvStake: bigint;
};

export interface TreasuryJournalStore {
  get(cycleId: string): Promise<TreasuryJournal | undefined>;
  put(journal: TreasuryJournal): Promise<void>;
}

export interface TreasuryPortfolioClient {
  read(inferenceWallet: string): Promise<TreasuryPortfolio>;
}

export interface TreasuryExecutionClient {
  ensureSettlementConvertedToUsdc(input: {
    inferenceWallet: string;
    amount: bigint;
    idempotencyKey: string;
  }): Promise<void>;
  ensureUsdcConvertedToVvv(input: {
    inferenceWallet: string;
    amount: bigint;
    idempotencyKey: string;
  }): Promise<void>;
  ensureVvvStaked(input: {
    inferenceWallet: string;
    amount: bigint;
    idempotencyKey: string;
  }): Promise<void>;
}

type OperatorDependencies = {
  journals: TreasuryJournalStore;
  portfolios: TreasuryPortfolioClient;
  execution: TreasuryExecutionClient;
  policy: TreasuryPolicy;
};

export class InferenceTreasuryOperator {
  constructor(private readonly dependencies: OperatorDependencies) {}

  async reconcile(cycle: TreasuryCycle): Promise<TreasuryJournal> {
    const existing = await this.dependencies.journals.get(cycle.cycleId);
    const journal = existing ?? this.createJournal(cycle);
    this.assertReplayMatches(journal, cycle);

    let portfolio = await this.dependencies.portfolios.read(cycle.inferenceWallet);
    if (
      !journal.completedSteps.includes("settlement-converted") &&
      portfolio.settlementAmount >= this.dependencies.policy.minimumSettlementConversion
    ) {
      const amount = portfolio.settlementAmount;
      await this.dependencies.execution.ensureSettlementConvertedToUsdc({
        inferenceWallet: cycle.inferenceWallet,
        amount,
        idempotencyKey: `${cycle.cycleId}:settlement-to-usdc`,
      });
      journal.settlementConverted = amount;
      await this.completeStep(journal, "settlement-converted");
      portfolio = await this.dependencies.portfolios.read(cycle.inferenceWallet);
    }

    const stakeableUsdc = max(
      0n,
      portfolio.usdcAmount - this.dependencies.policy.x402UsdcBufferTarget,
    );
    if (
      !journal.completedSteps.includes("usdc-converted-to-vvv") &&
      stakeableUsdc >= this.dependencies.policy.minimumUsdcStakeConversion
    ) {
      await this.dependencies.execution.ensureUsdcConvertedToVvv({
        inferenceWallet: cycle.inferenceWallet,
        amount: stakeableUsdc,
        idempotencyKey: `${cycle.cycleId}:usdc-to-vvv`,
      });
      journal.usdcConvertedToVvv = stakeableUsdc;
      await this.completeStep(journal, "usdc-converted-to-vvv");
      portfolio = await this.dependencies.portfolios.read(cycle.inferenceWallet);
    }

    if (
      !journal.completedSteps.includes("vvv-staked") &&
      portfolio.unstakedVvvAmount >= this.dependencies.policy.minimumVvvStake
    ) {
      const amount = portfolio.unstakedVvvAmount;
      await this.dependencies.execution.ensureVvvStaked({
        inferenceWallet: cycle.inferenceWallet,
        amount,
        idempotencyKey: `${cycle.cycleId}:stake-vvv`,
      });
      journal.vvvStaked = amount;
      await this.completeStep(journal, "vvv-staked");
    }

    await this.completeStep(journal, "reconciled");
    return journal;
  }

  private createJournal(cycle: TreasuryCycle): TreasuryJournal {
    return {
      ...cycle,
      completedSteps: [],
      settlementConverted: 0n,
      usdcConvertedToVvv: 0n,
      vvvStaked: 0n,
    };
  }

  private assertReplayMatches(journal: TreasuryJournal, cycle: TreasuryCycle) {
    if (journal.agentId !== cycle.agentId || journal.inferenceWallet !== cycle.inferenceWallet) {
      throw new Error(`Conflicting treasury replay for cycle ${cycle.cycleId}.`);
    }
  }

  private async completeStep(journal: TreasuryJournal, step: string) {
    if (!journal.completedSteps.includes(step)) {
      journal.completedSteps.push(step);
    }
    await this.dependencies.journals.put(structuredClone(journal));
  }
}

export class InMemoryTreasuryJournalStore implements TreasuryJournalStore {
  private readonly journals = new Map<string, TreasuryJournal>();

  async get(cycleId: string) {
    const journal = this.journals.get(cycleId);
    return journal ? structuredClone(journal) : undefined;
  }

  async put(journal: TreasuryJournal) {
    this.journals.set(journal.cycleId, structuredClone(journal));
  }
}

function max(left: bigint, right: bigint) {
  return left > right ? left : right;
}
