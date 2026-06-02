import { describe, expect, test } from "bun:test";
import {
  AgentEventProjector,
  InMemoryAgentProjectionStore,
  type AgentLaunchRequested,
  type FeesRouted,
  type MarketProvisioned,
} from "./agentProjector";

const launch: AgentLaunchRequested = {
  type: "AgentLaunchRequested",
  eventId: "8453:0xaaa:0",
  agentId: "1",
  creator: "0x0000000000000000000000000000000000000001",
  agentToken: "0x0000000000000000000000000000000000000002",
  feeProcessor: "0x0000000000000000000000000000000000000003",
  inferenceWallet: "0x0000000000000000000000000000000000000004",
  platformToken: "0x0000000000000000000000000000000000000005",
  metadataURI: "ipfs://afterimage",
};

const market: MarketProvisioned = {
  type: "MarketProvisioned",
  eventId: "8453:0xaaa:1",
  agentId: "1",
  market: "0x0000000000000000000000000000000000000006",
  marketAdapter: "0x0000000000000000000000000000000000000007",
};

const fees: FeesRouted = {
  type: "FeesRouted",
  eventId: "8453:0xbbb:0",
  agentId: "1",
  totalAmount: 100n,
  agentInferenceAmount: 60n,
  coldStartReserveAmount: 20n,
  protocolOperationsAmount: 10n,
  creatorAmount: 10n,
};

describe("AgentEventProjector", () => {
  test("projects launch, market, runtime, and cumulative fee status", async () => {
    const projector = new AgentEventProjector(new InMemoryAgentProjectionStore());
    await projector.project(launch);
    await projector.project(market);
    await projector.project({
      type: "RuntimeStatusUpdated",
      eventId: "8453:0xccc:0",
      agentId: "1",
      status: "online",
    });
    const agent = await projector.project(fees);

    expect(agent).toMatchObject({
      agentId: "1",
      market: market.market,
      marketAdapter: market.marketAdapter,
      runtimeStatus: "online",
      routedFees: {
        totalAmount: 100n,
        agentInferenceAmount: 60n,
        coldStartReserveAmount: 20n,
        protocolOperationsAmount: 10n,
        creatorAmount: 10n,
      },
    });
  });

  test("ignores duplicate log delivery", async () => {
    const projector = new AgentEventProjector(new InMemoryAgentProjectionStore());
    await projector.project(launch);
    await projector.project(fees);
    const agent = await projector.project(fees);

    expect(agent?.routedFees.totalAmount).toBe(100n);
  });

  test("defers out-of-order logs and drains them after launch identity arrives", async () => {
    const projector = new AgentEventProjector(new InMemoryAgentProjectionStore());
    expect(await projector.project(market)).toBeUndefined();
    expect(await projector.project(fees)).toBeUndefined();

    const agent = await projector.project(launch);

    expect(agent?.market).toBe(market.market);
    expect(agent?.routedFees.agentInferenceAmount).toBe(60n);
  });

  test("rejects conflicting launch identity for an existing agent id", async () => {
    const projector = new AgentEventProjector(new InMemoryAgentProjectionStore());
    await projector.project(launch);

    await expect(
      projector.project({
        ...launch,
        eventId: "8453:0xddd:0",
        agentToken: "0x0000000000000000000000000000000000009999",
      }),
    ).rejects.toThrow("agentToken changed");
  });
});
