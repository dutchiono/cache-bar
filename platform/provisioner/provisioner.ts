import {
  capabilityRegistry,
  type CapabilityDefaultMode,
  type CapabilityId,
} from "../../src/foundry/capabilities";

export type ProvisioningStatus = "provisioning" | "online";

export type AgentLaunchEvent = {
  agentId: string;
  creator: string;
  agentToken: string;
  feeProcessor: string;
  inferenceWallet: string;
  metadataURI: string;
};

export type InstalledCapability = {
  id: CapabilityId;
  mode: CapabilityDefaultMode;
  version: string;
};

export type ProvisioningRecord = AgentLaunchEvent & {
  status: ProvisioningStatus;
  solanaWallet?: string;
  runtimeId?: string;
  gatewayUrl?: string;
  installedCapabilities: InstalledCapability[];
  bootstrapInferenceArmed: boolean;
  completedSteps: string[];
};

export interface ProvisioningStore {
  get(agentId: string): Promise<ProvisioningRecord | undefined>;
  put(record: ProvisioningRecord): Promise<void>;
}

export interface CapabilityWalletClient {
  ensureSolanaWallet(agentId: string): Promise<{ address: string }>;
}

export interface RuntimeClient {
  ensureRuntime(input: {
    agentId: string;
    metadataURI: string;
  }): Promise<{ runtimeId: string; gatewayUrl: string }>;
}

export interface CapabilityInstaller {
  ensureInstalled(input: {
    agentId: string;
    runtimeId: string;
    capability: InstalledCapability;
  }): Promise<void>;
}

export interface BootstrapInferenceClient {
  ensureArmed(input: {
    agentId: string;
    inferenceWallet: string;
    runtimeId: string;
  }): Promise<void>;
}

type ProvisionerDependencies = {
  store: ProvisioningStore;
  wallets: CapabilityWalletClient;
  runtimes: RuntimeClient;
  capabilities: CapabilityInstaller;
  inference: BootstrapInferenceClient;
};

export class AgentProvisioner {
  constructor(private readonly dependencies: ProvisionerDependencies) {}

  async handleLaunch(event: AgentLaunchEvent): Promise<ProvisioningRecord> {
    const existing = await this.dependencies.store.get(event.agentId);
    const record = existing ?? this.createRecord(event);
    this.assertReplayMatches(record, event);

    if (!record.completedSteps.includes("solana-wallet-assigned")) {
      const wallet = await this.dependencies.wallets.ensureSolanaWallet(event.agentId);
      record.solanaWallet = wallet.address;
      await this.completeStep(record, "solana-wallet-assigned");
    }

    if (!record.completedSteps.includes("runtime-provisioned")) {
      const runtime = await this.dependencies.runtimes.ensureRuntime({
        agentId: event.agentId,
        metadataURI: event.metadataURI,
      });
      record.runtimeId = runtime.runtimeId;
      record.gatewayUrl = runtime.gatewayUrl;
      await this.completeStep(record, "runtime-provisioned");
    }

    if (!record.runtimeId) {
      throw new Error(`Runtime id is missing for agent ${record.agentId}.`);
    }

    for (const manifest of capabilityRegistry) {
      const step = `capability-installed:${manifest.id}`;
      if (record.completedSteps.includes(step)) continue;

      const capability = {
        id: manifest.id,
        mode: manifest.defaultMode,
        version: manifest.version,
      };
      await this.dependencies.capabilities.ensureInstalled({
        agentId: event.agentId,
        runtimeId: record.runtimeId,
        capability,
      });
      record.installedCapabilities.push(capability);
      await this.completeStep(record, step);
    }

    if (!record.completedSteps.includes("bootstrap-inference-armed")) {
      await this.dependencies.inference.ensureArmed({
        agentId: event.agentId,
        inferenceWallet: event.inferenceWallet,
        runtimeId: record.runtimeId,
      });
      record.bootstrapInferenceArmed = true;
      await this.completeStep(record, "bootstrap-inference-armed");
    }

    record.status = "online";
    await this.completeStep(record, "online");
    return record;
  }

  private createRecord(event: AgentLaunchEvent): ProvisioningRecord {
    return {
      ...event,
      status: "provisioning",
      installedCapabilities: [],
      bootstrapInferenceArmed: false,
      completedSteps: ["launch-observed"],
    };
  }

  private assertReplayMatches(record: ProvisioningRecord, event: AgentLaunchEvent) {
    const immutableFields = [
      "creator",
      "agentToken",
      "feeProcessor",
      "inferenceWallet",
      "metadataURI",
    ] as const;
    for (const field of immutableFields) {
      if (record[field] !== event[field]) {
        throw new Error(`Conflicting replay for agent ${event.agentId}: ${field} changed.`);
      }
    }
  }

  private async completeStep(record: ProvisioningRecord, step: string) {
    if (!record.completedSteps.includes(step)) {
      record.completedSteps.push(step);
    }
    await this.dependencies.store.put(structuredClone(record));
  }
}

export class InMemoryProvisioningStore implements ProvisioningStore {
  private readonly records = new Map<string, ProvisioningRecord>();

  async get(agentId: string) {
    const record = this.records.get(agentId);
    return record ? structuredClone(record) : undefined;
  }

  async put(record: ProvisioningRecord) {
    this.records.set(record.agentId, structuredClone(record));
  }
}
