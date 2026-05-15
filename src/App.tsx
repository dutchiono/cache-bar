import { useConvexAuth } from "@convex-dev/auth/react";
import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ScreenStub } from "./components/ScreenStub";
import { SignIn } from "./components/SignIn";
import Creators from "./pages/Creators";
import CreatorDetail from "./pages/CreatorDetail";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";

const stubRoutes: { path: string; title: string; subtitle?: string }[] = [
  { path: "/", title: "Dashboard", subtitle: "Commerce + treasury overview" },
  { path: "/submissions", title: "Submissions", subtitle: "Review queue" },
  { path: "/orders", title: "Orders", subtitle: "Card + USDC, all rails" },
  { path: "/orders/:id", title: "Order detail" },
  { path: "/customers", title: "Customers (CRM)", subtitle: "With wallets + $CACHE tier" },
  { path: "/customers/:id", title: "Customer detail" },
  { path: "/inventory", title: "Inventory & Fulfillment", subtitle: "POD, dropship, supplier funding" },
  { path: "/royalties", title: "Royalties & Payouts", subtitle: "Ledger + payout runs" },
  { path: "/treasury", title: "Treasury & Off-ramp", subtitle: "USDC multisig + fiat ops" },
  { path: "/token", title: "Token & Burn", subtitle: "$CACHE supply, tiers, burns" },
  { path: "/reports", title: "Reports & Analytics" },
  { path: "/automations", title: "Automations", subtitle: "No-code flow builder" },
  { path: "/storefront", title: "Storefront Preview", subtitle: "Customer-facing shop" },
  { path: "/checkout", title: "Checkout Preview", subtitle: "Card / USDC / $CACHE spend-to-burn" },
  { path: "/team", title: "Team & Roles", subtitle: "RBAC + multisig signer flag" },
  { path: "/settings", title: "Settings" },
  { path: "/agent", title: "Eliza Agent", subtitle: "Full console — Phase 12" },
];

export default function App() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignIn />;
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/creators" element={<Creators />} />
        <Route path="/creators/:id" element={<CreatorDetail />} />
        {stubRoutes.map((r) => (
          <Route
            key={r.path}
            path={r.path}
            element={<ScreenStub title={r.title} subtitle={r.subtitle} />}
          />
        ))}
        <Route
          path="*"
          element={<ScreenStub title="Not found" subtitle="No route matches." />}
        />
      </Route>
    </Routes>
  );
}
