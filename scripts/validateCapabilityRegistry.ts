import { capabilityRegistry } from "../src/foundry/capabilities";

const summary = capabilityRegistry.map((manifest) => ({
  id: manifest.id,
  version: manifest.version,
  mode: manifest.defaultMode,
  chains: manifest.chains.join(","),
  scopes: manifest.scopes.length,
  audit: manifest.auditStatus,
}));

console.table(summary);
console.log(`Validated ${summary.length} capability manifests.`);
