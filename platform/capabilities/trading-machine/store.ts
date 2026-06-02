import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { TradingMachineProposal, TradingMachineProposalStore } from "./types";

export class MemoryTradingMachineProposalStore implements TradingMachineProposalStore {
  protected proposals: TradingMachineProposal[] = [];

  findByIdempotencyKey(agentId: string, idempotencyKey: string) {
    return this.proposals.find(
      (proposal) => proposal.agentId === agentId && proposal.idempotencyKey === idempotencyKey,
    ) ?? null;
  }

  findById(agentId: string, proposalId: string) {
    return this.proposals.find(
      (proposal) => proposal.agentId === agentId && proposal.id === proposalId,
    ) ?? null;
  }

  insert(proposal: TradingMachineProposal) {
    this.proposals.push(proposal);
  }
}

export class JsonTradingMachineProposalStore extends MemoryTradingMachineProposalStore {
  constructor(private readonly path: string) {
    super();
    if (existsSync(path)) {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
      if (!Array.isArray(parsed)) throw new Error("Trading Machine proposal store must contain an array.");
      this.proposals = parsed as TradingMachineProposal[];
    }
  }

  override insert(proposal: TradingMachineProposal) {
    super.insert(proposal);
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, `${JSON.stringify(this.proposals, null, 2)}\n`, "utf8");
  }
}
