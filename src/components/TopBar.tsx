import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function TopBar() {
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.getCurrentUser);

  const displayName = me?.name ?? me?.email ?? "(no name)";
  const role = me?.role ?? "readonly";

  return (
    <header className="flex items-center gap-3 border-b border-zinc-800 bg-black/70 px-4 backdrop-blur">
      <div className="flex-1">
        <input
          placeholder="Search products, creators, orders..."
          className="w-full max-w-sm rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 placeholder:text-zinc-500"
        />
      </div>

      {/* Treasury pill — wired to real balance in Phase 8 */}
      <span title="USDC treasury balance (placeholder)" className="rounded-full border border-cyan-500/50 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
        Treasury — wire in Phase 8
      </span>

      {/* AI pill — opens Eliza in Phase 12 */}
      <span className="rounded-full border border-fuchsia-500/50 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-200">
        Eliza — Phase 12
      </span>

      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-300">{displayName}</span>
        <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] uppercase tracking-wide text-zinc-300">
          {role}
        </span>
        <button
          onClick={() => void signOut()}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
