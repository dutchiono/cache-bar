import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import App from "./App.tsx";
import { wagmiConfig } from "./chains/wagmi";
import { solanaEndpoint, solanaWallets } from "./chains/solana";

import "@solana/wallet-adapter-react-ui/styles.css";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  throw new Error(
    "VITE_CONVEX_URL is not set. Run `bunx convex dev` and ensure .env.local contains it.",
  );
}

const convex = new ConvexReactClient(convexUrl);
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ConvexAuthProvider client={convex}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <ConnectionProvider endpoint={solanaEndpoint}>
              <WalletProvider wallets={solanaWallets} autoConnect>
                <WalletModalProvider>
                  <App />
                </WalletModalProvider>
              </WalletProvider>
            </ConnectionProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ConvexAuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
