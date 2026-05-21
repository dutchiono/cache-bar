import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, requireSigner, requireUser } from "./model/auth";
import { chain } from "./schema";

const transactionType = v.union(
  v.literal("usdc_in"),
  v.literal("offramp_out"),
  v.literal("supplier_payment"),
  v.literal("creator_payout"),
);

const transactionStatus = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("failed"),
);

const offRampStatus = v.union(
  v.literal("proposed"),
  v.literal("approved"),
  v.literal("settling"),
  v.literal("settled"),
  v.literal("failed"),
);

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const accounts = await ctx.db.query("treasuryAccounts").collect();
    const transactions = await ctx.db.query("treasuryTransactions").collect();
    const offRampJobs = await ctx.db.query("offRampJobs").collect();

    const totalUsdc = accounts
      .filter((account) => account.kind === "usdc_multisig")
      .reduce((sum, account) => sum + account.balanceCache, 0);
    const totalFiat = accounts
      .filter((account) => account.kind === "fiat_ops")
      .reduce((sum, account) => sum + account.balanceCache, 0);

    const pendingOut = transactions
      .filter(
        (tx) =>
          tx.status === "pending" &&
          (tx.type === "offramp_out" ||
            tx.type === "supplier_payment" ||
            tx.type === "creator_payout"),
      )
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      accounts,
      transactions: transactions.sort((a, b) => b._creationTime - a._creationTime),
      offRampJobs: offRampJobs.sort((a, b) => b._creationTime - a._creationTime),
      metrics: {
        totalUsdc,
        totalFiat,
        pendingOut,
        proposedOffRamps: offRampJobs.filter((job) => job.status === "proposed").length,
      },
    };
  },
});

export const createAccount = mutation({
  args: {
    label: v.string(),
    kind: v.union(v.literal("usdc_multisig"), v.literal("fiat_ops")),
    chain: v.optional(chain),
    address: v.optional(v.string()),
    multisigConfig: v.optional(v.string()),
    balanceCache: v.number(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "finance"]);
    validateAmount(args.balanceCache, "balanceCache");
    if (!args.label.trim()) throw new Error("Account label is required.");
    return await ctx.db.insert("treasuryAccounts", args);
  },
});

export const recordTransaction = mutation({
  args: {
    accountId: v.id("treasuryAccounts"),
    type: transactionType,
    amount: v.number(),
    currency: v.string(),
    chain: v.optional(chain),
    txHash: v.optional(v.string()),
    ref: v.optional(v.string()),
    status: transactionStatus,
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "finance"]);
    validateAmount(args.amount, "amount");
    const account = await ctx.db.get(args.accountId);
    if (!account) throw new Error("Treasury account not found.");

    const id = await ctx.db.insert("treasuryTransactions", args);
    if (args.status === "confirmed") {
      const delta = args.type === "usdc_in" ? args.amount : -args.amount;
      await ctx.db.patch(args.accountId, {
        balanceCache: account.balanceCache + delta,
      });
    }
    return id;
  },
});

export const proposeOffRamp = mutation({
  args: {
    fromAccountId: v.id("treasuryAccounts"),
    amountUsdc: v.number(),
    expectedFiat: v.number(),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await requireRole(ctx, ["admin", "finance"]);
    validateAmount(args.amountUsdc, "amountUsdc");
    validateAmount(args.expectedFiat, "expectedFiat");
    if (!args.provider.trim()) throw new Error("Provider is required.");

    const account = await ctx.db.get(args.fromAccountId);
    if (!account) throw new Error("Treasury account not found.");
    if (account.kind !== "usdc_multisig") {
      throw new Error("Off-ramp source must be a USDC multisig account.");
    }
    if (account.balanceCache < args.amountUsdc) {
      throw new Error("Off-ramp amount exceeds cached account balance.");
    }

    return await ctx.db.insert("offRampJobs", {
      ...args,
      status: "proposed",
      proposedByUserId: me._id,
      proposedByAgent: false,
    });
  },
});

export const setOffRampStatus = mutation({
  args: {
    id: v.id("offRampJobs"),
    status: offRampStatus,
    fiatTxRef: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, fiatTxRef }) => {
    await requireSigner(ctx);
    const job = await ctx.db.get(id);
    if (!job) throw new Error("Off-ramp job not found.");
    const account = await ctx.db.get(job.fromAccountId);
    if (!account) throw new Error("Source account not found.");

    if (status === "settled" && job.status !== "settled") {
      if (account.balanceCache < job.amountUsdc) {
        throw new Error("Off-ramp settlement exceeds cached account balance.");
      }
      await ctx.db.patch(job.fromAccountId, {
        balanceCache: account.balanceCache - job.amountUsdc,
      });
      await ctx.db.insert("treasuryTransactions", {
        accountId: job.fromAccountId,
        type: "offramp_out",
        amount: job.amountUsdc,
        currency: "USDC",
        chain: account.chain,
        ref: fiatTxRef ?? `offramp:${id}`,
        status: "confirmed",
      });
    }

    await ctx.db.patch(id, { status, fiatTxRef });
  },
});

export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "finance"]);
    const existing = await ctx.db.query("treasuryAccounts").collect();
    if (existing.some((account) => account.label === ".cache Safe - Base USDC")) {
      return { seeded: false };
    }

    const safeId = await ctx.db.insert("treasuryAccounts", {
      label: ".cache Safe - Base USDC",
      kind: "usdc_multisig",
      chain: "evm",
      address: "0xCacHe0000000000000000000000000000000bAr",
      multisigConfig: "3/5 Safe",
      balanceCache: 18420.5,
    });
    const solId = await ctx.db.insert("treasuryAccounts", {
      label: ".cache Squads - Solana USDC",
      kind: "usdc_multisig",
      chain: "solana",
      address: "CACHEbarDemo1111111111111111111111111111",
      multisigConfig: "2/4 Squads",
      balanceCache: 6420,
    });
    const fiatId = await ctx.db.insert("treasuryAccounts", {
      label: "Fiat Ops - Mercury",
      kind: "fiat_ops",
      balanceCache: 9800,
    });

    await ctx.db.insert("treasuryTransactions", {
      accountId: safeId,
      type: "usdc_in",
      amount: 12450.5,
      currency: "USDC",
      chain: "evm",
      txHash: "0xvisiondropinflow",
      status: "confirmed",
    });
    await ctx.db.insert("treasuryTransactions", {
      accountId: solId,
      type: "creator_payout",
      amount: 840,
      currency: "USDC",
      chain: "solana",
      ref: "creator-payout-demo",
      status: "pending",
    });
    await ctx.db.insert("treasuryTransactions", {
      accountId: fiatId,
      type: "supplier_payment",
      amount: 2150,
      currency: "USD",
      ref: "blank-tee-po-0007",
      status: "confirmed",
    });
    await ctx.db.insert("offRampJobs", {
      fromAccountId: safeId,
      amountUsdc: 5000,
      expectedFiat: 4975,
      provider: "Bridge / Mercury",
      status: "proposed",
      proposedByAgent: true,
    });

    return { seeded: true };
  },
});

function validateAmount(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative finite number.`);
  }
}
