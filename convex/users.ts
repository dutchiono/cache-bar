import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

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

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const email = user.email?.trim().toLowerCase();
    if (email && getAdminEmails().has(email)) {
      return {
        ...user,
        role: "admin" as const,
        elizaAccess: "full" as const,
        isMultisigSigner: true,
      };
    }
    return user;
  },
});
