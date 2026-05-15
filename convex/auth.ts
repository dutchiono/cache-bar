import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

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

function isBootstrapAdmin(email: string | undefined) {
  if (!email) return false;
  return getAdminEmails().has(email.trim().toLowerCase());
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const email =
        typeof args.profile?.email === "string"
          ? args.profile.email
          : undefined;

      if (args.existingUserId) {
        if (isBootstrapAdmin(email)) {
          const existingUser = await ctx.db.get(args.existingUserId);
          if (
            existingUser &&
            (existingUser.role !== "admin" ||
              existingUser.elizaAccess !== "full" ||
              !existingUser.isMultisigSigner)
          ) {
            await ctx.db.patch(args.existingUserId, {
              role: "admin",
              elizaAccess: "full",
              isMultisigSigner: true,
            });
          }
        }
        return args.existingUserId;
      }

      const admin = isBootstrapAdmin(email);

      return await ctx.db.insert("users", {
        ...args.profile,
        role: admin ? "admin" : "readonly",
        elizaAccess: admin ? "full" : "off",
        isMultisigSigner: admin,
      });
    },
  },
});
