import { clusterApiUrl } from "@solana/web3.js";

export const solanaEndpoint =
  import.meta.env.VITE_SOL_RPC_URL ?? clusterApiUrl("mainnet-beta");

// Empty wallets array — Wallet Standard (Phantom, Solflare, Backpack, etc.)
// auto-registers compatible browser extensions. Add explicit adapters here
// only for wallets that don't yet support Wallet Standard.
export const solanaWallets = [];
