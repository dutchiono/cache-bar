import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";

export function TopBar() {
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.getCurrentUser);
  const treasury = useQuery(api.treasury.overview, {});

  const displayName = me?.name ?? me?.email ?? "(no name)";
  const role = me?.role ?? "readonly";
  const usdcBalance = treasury?.metrics.totalUsdc ?? 0;

  return (
    <header className="flex items-center gap-3 border-b border-[var(--cb-line)] bg-[var(--cb-paper-soft)]/88 px-5 backdrop-blur">
      <div className="flex-1">
        <input
          placeholder="Search products, orders, creators, customers"
          className="cb-field max-w-md"
        />
      </div>

      <span title="USDC treasury balance" className="cb-badge border-[rgba(73,108,143,0.4)] bg-[rgba(73,108,143,0.1)] text-[var(--cb-blue)]">
        Treasury ${usdcBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC
      </span>

      <Link
        to="/app/agent"
        className="cb-badge border-[rgba(182,95,67,0.38)] bg-[rgba(182,95,67,0.12)] text-[var(--cb-clay)]"
      >
        Agent Console
      </Link>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{displayName}</span>
        <span className="cb-badge rounded-md px-2 py-0.5 text-[10px]">
          {role}
        </span>
        <button
          onClick={() => void signOut()}
          className="cb-button-secondary min-h-8 px-2 py-1 text-xs"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
