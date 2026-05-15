import { getAuthUserId, modifyAccountCredentials, retrieveAccount } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { action } from "./_generated/server";

export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { currentPassword, newPassword }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not signed in.");
    if (!newPassword || newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters.");
    }

    const me = await ctx.runQuery(api.users.getCurrentUser, {});
    const email = me?.email?.trim().toLowerCase();
    if (!email) throw new Error("Your account does not have an email.");

    const account = await retrieveAccount(ctx, {
      provider: "password",
      account: {
        id: email,
        secret: currentPassword,
      },
    });
    if (!account) throw new Error("Current password is incorrect.");

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: {
        id: email,
        secret: newPassword,
      },
    });

    return { ok: true };
  },
});
