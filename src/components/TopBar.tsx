import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function TopBar() {
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.getCurrentUser);

  const displayName = me?.name ?? me?.email ?? "(no name)";
  const role = me?.role ?? "readonly";

  return (
    <header className="flex items-center gap-3 border-b-2 border-black px-4">
      <div className="flex-1">
        <input
          placeholder="Search..."
          className="w-full max-w-sm rounded border border-dashed border-neutral-400 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-500"
        />
      </div>

      {/* Treasury pill — wired to real balance in Phase 8 */}
      <span
        title="USDC treasury balance (placeholder)"
        className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs"
      >
        Treasury — wire in Phase 8
      </span>

      {/* AI pill — opens Eliza in Phase 12 */}
      <span className="rounded-full border border-purple-300 bg-purple-50 px-3 py-1 text-xs">
        Eliza — Phase 12
      </span>

      <div className="flex items-center gap-2">
        <span className="text-sm">{displayName}</span>
        <span className="rounded border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-neutral-600">
          {role}
        </span>
        <button
          onClick={() => void signOut()}
          className="rounded border border-neutral-400 px-2 py-1 text-xs hover:bg-neutral-100"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
