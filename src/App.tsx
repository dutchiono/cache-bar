import { useConvexAuth } from "@convex-dev/auth/react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ScreenStub } from "./components/ScreenStub";
import { SignIn } from "./components/SignIn";
import AgentConsole from "./pages/AgentConsole";
import Automations from "./pages/Automations";
import Checkout from "./pages/Checkout";
import CustomerDetail from "./pages/CustomerDetail";
import Customers from "./pages/Customers";
import Creators from "./pages/Creators";
import CreatorDetail from "./pages/CreatorDetail";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import OrderDetail from "./pages/OrderDetail";
import Orders from "./pages/Orders";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Reports from "./pages/Reports";
import Royalties from "./pages/Royalties";
import Settings from "./pages/Settings";
import Storefront from "./pages/Storefront";
import Submissions from "./pages/Submissions";
import Team from "./pages/Team";
import TokenBurn from "./pages/TokenBurn";
import Treasury from "./pages/Treasury";

const legacyAdminRedirects = [
  "products",
  "submissions",
  "creators",
  "checkout",
  "orders",
  "settings",
  "team",
  "token",
  "treasury",
  "customers",
  "inventory",
  "royalties",
  "reports",
  "automations",
  "agent",
  "storefront",
];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Storefront />} />
      <Route path="/checkout" element={<Storefront focusCheckout />} />
      <Route path="/storefront" element={<Navigate to="/" replace />} />

      <Route path="/app" element={<ProtectedOpsLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="creators" element={<Creators />} />
        <Route path="creators/:id" element={<CreatorDetail />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="royalties" element={<Royalties />} />
        <Route path="reports" element={<Reports />} />
        <Route path="automations" element={<Automations />} />
        <Route path="agent" element={<AgentConsole />} />
        <Route path="settings" element={<Settings />} />
        <Route path="team" element={<Team />} />
        <Route path="token" element={<TokenBurn />} />
        <Route path="treasury" element={<Treasury />} />
        <Route path="storefront" element={<Navigate to="/" replace />} />
        <Route
          path="*"
          element={<ScreenStub title="Not found" subtitle="No route matches." />}
        />
      </Route>

      {legacyAdminRedirects.map((path) => (
        <Route
          key={path || "legacy-root"}
          path={`/${path}`}
          element={<Navigate to={path ? `/app/${path}` : "/app"} replace />}
        />
      ))}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function ProtectedOpsLayout() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cb-paper)] text-sm text-neutral-500">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignIn />;
  }

  return <AppShell />;
}
