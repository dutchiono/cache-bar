import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Coinbase Wallet connector intentionally omitted at Phase 0.
// Revisit at Phase 6 (checkout) — Coinbase Smart Wallet is the natural
// onboarding path for customers without an existing wallet.

const rpcUrl = import.meta.env.VITE_EVM_RPC_URL ?? "https://mainnet.base.org";

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [injected()],
  transports: {
    [base.id]: http(rpcUrl),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
