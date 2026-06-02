import { describe, expect, test } from "bun:test";
import {
  AgentProvisioner,
  InMemoryProvisioningStore,
  type AgentLaunchEvent,
  type BootstrapInferenceClient,
  type CapabilityInstaller,
  type CapabilityWalletClient,
  type RuntimeClient,
} from "./provisioner";

const launch: AgentLaunchEvent = {
  agentId: "1",
  creator: "0x0000000000000000000000000000000000000001",
  agentToken: "0x0000000000000000000000000000000000000002",
  feeProcessor: "0x0000000000000000000000000000000000000003",
  inferenceWallet: "0x0000000000000000000000000000000000000004",
  metadataURI: "ipfs://afterimage",
};

function createHarness(options?: { failRuntimeOnce?: boolean }) {
  const calls = {
    wallets: 0,
    runtimes: 0,
    capabilities: [] as string[],
    inference: 0,
  };
  let shouldFailRuntime = options?.failRuntimeOnce ?? false;

  const wallets: CapabilityWalletClient = {
    async ensureSolanaWallet(agentId) {
      calls.wallets += 1;
      return { address: `solana:${agentId}` };
    },
  };
  const runtimes: RuntimeClient = {
    async ensureRuntime({ agentId }) {
      calls.runtimes += 1;
      if (shouldFailRuntime) {
        shouldFailRuntime = false;
        throw new Error("runtime unavailable");
      }
      return { runtimeId: `runtime:${agentId}`, gatewayUrl: `https://agents.test/${agentId}` };
    },
  };
  const capabilities: CapabilityInstaller = {
    async ensureInstalled({ capability }) {
      calls.capabilities.push(`${capability.id}:${capability.mode}`);
    },
  };
  const inference: BootstrapInferenceClient = {
    async ensureArmed() {
      calls.inference += 1;
    },
  };
  const store = new InMemoryProvisioningStore();
  const provisioner = new AgentProvisioner({ store, wallets, runtimes, capabilities, inference });

  return { provisioner, store, calls };
}

describe("AgentProvisioner", () => {
  test("provisions runtime, wallet, constrained capabilities, and bootstrap inference", async () => {
    const { provisioner } = createHarness();
    const record = await provisioner.handleLaunch(launch);

    expect(record.status).toBe("online");
    expect(record.solanaWallet).toBe("solana:1");
    expect(record.runtimeId).toBe("runtime:1");
    expect(record.bootstrapInferenceArmed).toBe(true);
    expect(record.installedCapabilities).toEqual([
      { id: "cachebar-commerce", mode: "enabled", version: "0.1.0" },
      { id: "trading-machine", mode: "watch-only", version: "0.2.0-local" },
      { id: "verse", mode: "operator-only", version: "0.1.0" },
    ]);
  });

  test("is idempotent for duplicate launch delivery", async () => {
    const { provisioner, calls } = createHarness();
    await provisioner.handleLaunch(launch);
    await provisioner.handleLaunch(launch);

    expect(calls).toEqual({
      wallets: 1,
      runtimes: 1,
      capabilities: [
        "cachebar-commerce:enabled",
        "trading-machine:watch-only",
        "verse:operator-only",
      ],
      inference: 1,
    });
  });

  test("resumes after a partial runtime failure without duplicating the wallet", async () => {
    const { provisioner, calls } = createHarness({ failRuntimeOnce: true });

    await expect(provisioner.handleLaunch(launch)).rejects.toThrow("runtime unavailable");
    const record = await provisioner.handleLaunch(launch);

    expect(record.status).toBe("online");
    expect(calls.wallets).toBe(1);
    expect(calls.runtimes).toBe(2);
    expect(calls.inference).toBe(1);
  });

  test("rejects a conflicting replay for an existing agent id", async () => {
    const { provisioner } = createHarness();
    await provisioner.handleLaunch(launch);

    await expect(
      provisioner.handleLaunch({ ...launch, agentToken: "0x0000000000000000000000000000000000009999" }),
    ).rejects.toThrow("agentToken changed");
  });
});
