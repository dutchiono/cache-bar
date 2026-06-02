export type RuntimeStatus = "provisioning" | "online" | "degraded" | "suspended";

type IndexedEventBase = {
  eventId: string;
  agentId: string;
};

export type AgentLaunchRequested = IndexedEventBase & {
  type: "AgentLaunchRequested";
  creator: string;
  agentToken: string;
  feeProcessor: string;
  inferenceWallet: string;
  platformToken: string;
  metadataURI: string;
};

export type MarketProvisioned = IndexedEventBase & {
  type: "MarketProvisioned";
  market: string;
  marketAdapter: string;
};

export type RuntimeStatusUpdated = IndexedEventBase & {
  type: "RuntimeStatusUpdated";
  status: RuntimeStatus;
};

export type FeesRouted = IndexedEventBase & {
  type: "FeesRouted";
  totalAmount: bigint;
  agentInferenceAmount: bigint;
  coldStartReserveAmount: bigint;
  protocolOperationsAmount: bigint;
  creatorAmount: bigint;
};

export type AgentFoundryEvent =
  | AgentLaunchRequested
  | MarketProvisioned
  | RuntimeStatusUpdated
  | FeesRouted;

export type AgentProjection = Omit<AgentLaunchRequested, "type" | "eventId"> & {
  market?: string;
  marketAdapter?: string;
  runtimeStatus: RuntimeStatus;
  routedFees: {
    totalAmount: bigint;
    agentInferenceAmount: bigint;
    coldStartReserveAmount: bigint;
    protocolOperationsAmount: bigint;
    creatorAmount: bigint;
  };
};

export interface AgentProjectionStore {
  getAgent(agentId: string): Promise<AgentProjection | undefined>;
  putAgent(agent: AgentProjection): Promise<void>;
  hasProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string): Promise<void>;
  defer(event: AgentFoundryEvent): Promise<void>;
  takeDeferred(agentId: string): Promise<AgentFoundryEvent[]>;
}

export class AgentEventProjector {
  constructor(private readonly store: AgentProjectionStore) {}

  async project(event: AgentFoundryEvent): Promise<AgentProjection | undefined> {
    if (await this.store.hasProcessed(event.eventId)) {
      return await this.store.getAgent(event.agentId);
    }

    if (event.type === "AgentLaunchRequested") {
      await this.applyLaunch(event);
      await this.store.markProcessed(event.eventId);
      for (const deferred of await this.store.takeDeferred(event.agentId)) {
        await this.project(deferred);
      }
      return await this.store.getAgent(event.agentId);
    }

    const agent = await this.store.getAgent(event.agentId);
    if (!agent) {
      await this.store.defer(event);
      return undefined;
    }

    if (event.type === "MarketProvisioned") {
      agent.market = event.market;
      agent.marketAdapter = event.marketAdapter;
    } else if (event.type === "RuntimeStatusUpdated") {
      agent.runtimeStatus = event.status;
    } else {
      agent.routedFees.totalAmount += event.totalAmount;
      agent.routedFees.agentInferenceAmount += event.agentInferenceAmount;
      agent.routedFees.coldStartReserveAmount += event.coldStartReserveAmount;
      agent.routedFees.protocolOperationsAmount += event.protocolOperationsAmount;
      agent.routedFees.creatorAmount += event.creatorAmount;
    }

    await this.store.putAgent(agent);
    await this.store.markProcessed(event.eventId);
    return agent;
  }

  private async applyLaunch(event: AgentLaunchRequested) {
    const existing = await this.store.getAgent(event.agentId);
    if (existing) {
      const immutableFields = [
        "creator",
        "agentToken",
        "feeProcessor",
        "inferenceWallet",
        "platformToken",
        "metadataURI",
      ] as const;
      for (const field of immutableFields) {
        if (existing[field] !== event[field]) {
          throw new Error(`Conflicting launch identity for agent ${event.agentId}: ${field} changed.`);
        }
      }
      return existing;
    }

    const agent = {
      agentId: event.agentId,
      creator: event.creator,
      agentToken: event.agentToken,
      feeProcessor: event.feeProcessor,
      inferenceWallet: event.inferenceWallet,
      platformToken: event.platformToken,
      metadataURI: event.metadataURI,
      runtimeStatus: "provisioning",
      routedFees: {
        totalAmount: 0n,
        agentInferenceAmount: 0n,
        coldStartReserveAmount: 0n,
        protocolOperationsAmount: 0n,
        creatorAmount: 0n,
      },
    } satisfies AgentProjection;
    await this.store.putAgent(agent);
    return agent;
  }
}

export class InMemoryAgentProjectionStore implements AgentProjectionStore {
  private readonly agents = new Map<string, AgentProjection>();
  private readonly processed = new Set<string>();
  private readonly deferred = new Map<string, Map<string, AgentFoundryEvent>>();

  async getAgent(agentId: string) {
    const agent = this.agents.get(agentId);
    return agent ? structuredClone(agent) : undefined;
  }

  async putAgent(agent: AgentProjection) {
    this.agents.set(agent.agentId, structuredClone(agent));
  }

  async hasProcessed(eventId: string) {
    return this.processed.has(eventId);
  }

  async markProcessed(eventId: string) {
    this.processed.add(eventId);
  }

  async defer(event: AgentFoundryEvent) {
    const agentEvents = this.deferred.get(event.agentId) ?? new Map<string, AgentFoundryEvent>();
    agentEvents.set(event.eventId, structuredClone(event));
    this.deferred.set(event.agentId, agentEvents);
  }

  async takeDeferred(agentId: string) {
    const events = [...(this.deferred.get(agentId)?.values() ?? [])];
    this.deferred.delete(agentId);
    return events;
  }
}
