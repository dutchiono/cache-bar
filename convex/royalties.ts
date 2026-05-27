import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./model/auth";

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "finance", "readonly"]);
    const ledger = await ctx.db.query("royaltyLedger").collect();
    const payouts = await ctx.db.query("payouts").collect();
    const creators = await ctx.db.query("creators").collect();

    const creatorMap = new Map<string, (typeof creators)[number]>(
      creators.map((creator) => [creator._id, creator]),
    );
    const payoutMap = new Map<string, (typeof payouts)[number]>(
      payouts.map((payout) => [payout._id, payout]),
    );

    const pendingByCreator = new Map<string, number>();
    for (const entry of ledger) {
      if (!entry.payeeCreatorId || entry.payoutId || entry.amount <= 0) continue;
      const key = entry.payeeCreatorId;
      pendingByCreator.set(key, roundMoney((pendingByCreator.get(key) ?? 0) + entry.amount));
    }

    return {
      pendingCreators: Array.from(pendingByCreator.entries())
        .map(([creatorId, amount]) => ({
          creatorId,
          creator: creatorMap.get(creatorId) ?? null,
          amount,
        }))
        .sort((a, b) => b.amount - a.amount),
      recentEntries: ledger
        .sort((a, b) => b.accruedAt - a.accruedAt)
        .slice(0, 100)
        .map((entry) => ({
          ...entry,
          creator: entry.payeeCreatorId ? creatorMap.get(entry.payeeCreatorId) ?? null : null,
          payout: entry.payoutId ? payoutMap.get(entry.payoutId) ?? null : null,
        })),
      payouts: payouts
        .sort((a, b) => b.periodEnd - a.periodEnd)
        .map((payout) => ({
          ...payout,
          creator: creatorMap.get(payout.creatorId) ?? null,
        })),
    };
  },
});

export const createPayout = mutation({
  args: {
    creatorId: v.id("creators"),
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  handler: async (ctx, { creatorId, periodStart, periodEnd }) => {
    await requireRole(ctx, ["admin", "finance"]);
    const creator = await ctx.db.get(creatorId);
    if (!creator) throw new Error("Creator not found.");

    const entries = (
      await ctx.db
        .query("royaltyLedger")
        .withIndex("by_payee", (q) => q.eq("payeeCreatorId", creatorId))
        .collect()
    ).filter(
      (entry) =>
        !entry.payoutId &&
        entry.amount > 0 &&
        entry.accruedAt >= periodStart &&
        entry.accruedAt <= periodEnd,
    );

    if (entries.length === 0) {
      throw new Error("No unpaid royalty entries found for this creator and period.");
    }

    const amount = roundMoney(entries.reduce((sum, entry) => sum + entry.amount, 0));
    const payoutId = await ctx.db.insert("payouts", {
      creatorId,
      periodStart,
      periodEnd,
      amount,
      method: creator.payoutMethod.kind,
      chain: creator.payoutMethod.chain,
      status: "pending",
    });

    for (const entry of entries) {
      await ctx.db.patch(entry._id, { payoutId });
    }

    return payoutId;
  },
});

export const setPayoutStatus = mutation({
  args: {
    payoutId: v.id("payouts"),
    status: v.union(v.literal("pending"), v.literal("paid"), v.literal("failed")),
    txHashOrRef: v.optional(v.string()),
  },
  handler: async (ctx, { payoutId, status, txHashOrRef }) => {
    await requireRole(ctx, ["admin", "finance"]);
    const payout = await ctx.db.get(payoutId);
    if (!payout) throw new Error("Payout not found.");

    if (status === "paid" && payout.status !== "paid") {
      const account = (await ctx.db.query("treasuryAccounts").collect()).find((candidate) =>
        payout.method === "usdc_wallet"
          ? candidate.kind === "usdc_multisig" && candidate.chain === payout.chain
          : candidate.kind === "fiat_ops",
      );
      if (!account) throw new Error("No treasury account available for this payout method.");
      if (account.balanceCache < payout.amount) {
        throw new Error("Creator payout exceeds cached treasury balance.");
      }

      const existing = (await ctx.db.query("treasuryTransactions").collect()).find(
        (tx) => tx.ref === `payout:${payoutId}`,
      );
      if (!existing) {
        await ctx.db.insert("treasuryTransactions", {
          accountId: account._id,
          type: "creator_payout",
          amount: payout.amount,
          currency: payout.method === "usdc_wallet" ? "USDC" : "USD",
          chain: account.chain,
          txHash: txHashOrRef,
          ref: `payout:${payoutId}`,
          status: "confirmed",
        });
        await ctx.db.patch(account._id, {
          balanceCache: roundMoney(account.balanceCache - payout.amount),
        });
      }
    }

    await ctx.db.patch(payoutId, {
      status,
      txHashOrRef,
    });
  },
});

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
