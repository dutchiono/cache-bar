import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { elizaAccess, staffRole } from "./schema";
import { requireRole } from "./model/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);
    const users = await ctx.db.query("users").collect();
    const bootstrapAdmins = getAdminEmails();

    return users
      .map((user) => {
        const email = user.email?.trim().toLowerCase();
        const bootstrapAdmin = email ? bootstrapAdmins.has(email) : false;
        return bootstrapAdmin
          ? {
              ...user,
              role: "admin" as const,
              elizaAccess: "full" as const,
              isMultisigSigner: true,
              bootstrapAdmin,
            }
          : { ...user, bootstrapAdmin };
      })
      .sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
  },
});

export const updateMember = mutation({
  args: {
    userId: v.id("users"),
    role: staffRole,
    elizaAccess,
    isMultisigSigner: v.boolean(),
  },
  handler: async (ctx, { userId, role, elizaAccess, isMultisigSigner }) => {
    await requireRole(ctx, ["admin"]);
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found.");

    const email = user.email?.trim().toLowerCase();
    if (email && getAdminEmails().has(email)) {
      throw new Error("Bootstrap admin access is managed by CONVEX_ADMIN_EMAILS.");
    }

    await ctx.db.patch(userId, { role, elizaAccess, isMultisigSigner });
  },
});

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
