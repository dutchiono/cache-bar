// Shared auth helpers. Not exported as queries/mutations/actions, so they
// don't appear in the public API. Centralized further in Phase 11.

import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

// Queries and mutations only — actions don't have direct db access. If we
// need RBAC inside an action later, call a query that wraps requireUser.
type Ctx = QueryCtx | MutationCtx;

export type StaffRole = Doc<"users">["role"];

function getAdminEmails() {
  const raw = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.CONVEX_ADMIN_EMAILS;
  return new Set(
    (raw ?? "")
      .split(",")
      .map((email: string) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function withEffectiveRole(user: Doc<"users">): Doc<"users"> {
  const email = user.email?.trim().toLowerCase();
  if (!email || !getAdminEmails().has(email)) return user;
  return {
    ...user,
    role: "admin",
    elizaAccess: "full",
    isMultisigSigner: true,
  };
}

export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not signed in.");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User record missing.");
  return withEffectiveRole(user);
}

export async function requireRole(
  ctx: Ctx,
  allowed: StaffRole[],
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!allowed.includes(user.role)) {
    throw new Error(
      `Forbidden — requires one of [${allowed.join(", ")}], you are "${user.role}".`,
    );
  }
  return user;
}

export async function requireSigner(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!user.isMultisigSigner) {
    throw new Error("Forbidden — multisig signer required.");
  }
  return user;
}
