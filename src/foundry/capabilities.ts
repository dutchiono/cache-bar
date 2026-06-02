import cachebarCommerce from "../../capabilities/manifests/cachebar-commerce.json";
import tradingMachine from "../../capabilities/manifests/trading-machine.json";
import verse from "../../capabilities/manifests/verse.json";

export type CapabilityId = "cachebar-commerce" | "trading-machine" | "verse";
export type CapabilityChain = "base" | "solana";
export type CapabilityDefaultMode = "enabled" | "watch-only" | "disabled" | "operator-only";
export type CapabilityAuditStatus = "prototype" | "reviewed" | "production";
export type CapabilityTone = "live" | "guarded" | "restricted";
export type CapabilitySourceKind = "git" | "local-prototype";

export type CapabilityManifest = {
  schemaVersion: 1;
  id: CapabilityId;
  version: string;
  display: {
    name: string;
    eyebrow: string;
    description: string;
    status: string;
    tone: CapabilityTone;
  };
  source: {
    kind: CapabilitySourceKind;
    repository: string;
    ref: string;
  };
  chains: CapabilityChain[];
  defaultMode: CapabilityDefaultMode;
  scopes: string[];
  secretRequirements: string[];
  walletPolicy: string;
  healthCheck: string;
  auditStatus: CapabilityAuditStatus;
};

const rawCapabilityRegistry = [
  cachebarCommerce,
  tradingMachine,
  verse,
] as CapabilityManifest[];

export const capabilityRegistry = validateCapabilityRegistry(rawCapabilityRegistry);

export function validateCapabilityRegistry(manifests: CapabilityManifest[]) {
  const seenIds = new Set<string>();

  for (const manifest of manifests) {
    if (manifest.schemaVersion !== 1) {
      throw new Error(`Unsupported capability schema for ${manifest.id}.`);
    }
    if (!manifest.id || seenIds.has(manifest.id)) {
      throw new Error(`Capability id is missing or duplicated: ${manifest.id}.`);
    }
    if (!manifest.version || !manifest.source.repository || !manifest.source.ref) {
      throw new Error(`Capability ${manifest.id} is missing source provenance.`);
    }
    if (manifest.chains.length === 0 || manifest.scopes.length === 0) {
      throw new Error(`Capability ${manifest.id} must declare chains and scopes.`);
    }
    if (new Set(manifest.scopes).size !== manifest.scopes.length) {
      throw new Error(`Capability ${manifest.id} declares duplicate scopes.`);
    }
    if (!manifest.walletPolicy || !manifest.healthCheck) {
      throw new Error(`Capability ${manifest.id} is missing its wallet policy or health check.`);
    }
    if (manifest.id === "verse" && manifest.defaultMode !== "operator-only") {
      throw new Error("Verse must remain operator-only.");
    }
    if (manifest.id === "trading-machine" && manifest.defaultMode !== "watch-only") {
      throw new Error("Trading Machine must launch in watch-only mode.");
    }

    seenIds.add(manifest.id);
  }

  return manifests;
}
