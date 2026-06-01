import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalQuery, mutation, query, action, internalMutation } from "./_generated/server";
import { rateLimiter } from "./componentLimits";
import { recordRedemptionMetric, replaceRedemptionMetric } from "./componentMetrics";
import { getStripe, promotionCodeSlug } from "./lib/stripe";
import { requireRole } from "./model/auth";

type RedemptionContext = {
  status: "awaiting_burn" | "verified" | "issued" | "redeemed" | "failed";
  promotionCode?: string;
  discountValueUsd: number;
  expiresAt?: number;
  programName: string;
  programId: Id<"tokenPrograms">;
  chain: "evm" | "solana";
  tokenKind: "native" | "erc20" | "spl";
  tokenAddress?: string;
  tokenDecimals: number;
  burnTarget: string;
  burnMechanism: "transfer_to_burn" | "contract_burn" | "manual_verify";
  amountTokens: number;
  walletAddress?: string;
  promotionCodePrefix?: string;
  promotionCodeExpiresInDays?: number;
};

export const publicPrograms = query({
  args: {},
  handler: async (ctx) => {
    const programs = await ctx.db
      .query("tokenPrograms")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return programs.filter((program) => program.redemptionEnabled ?? true);
  },
});

export const redemptions = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "finance", "support", "catalog_manager"]);
    const rows = await ctx.db.query("stashRedemptions").collect();
    return await Promise.all(
      rows
        .sort((a, b) => b._creationTime - a._creationTime)
        .slice(0, 100)
        .map(async (row) => ({
          ...row,
          program: await ctx.db.get(row.programId),
        })),
    );
  },
});

export const createRedemptionIntent = mutation({
  args: {
    programId: v.id("tokenPrograms"),
    customerEmail: v.string(),
    walletAddress: v.optional(v.string()),
    amountTokens: v.number(),
  },
  handler: async (ctx, { programId, customerEmail, walletAddress, amountTokens }) => {
    const emailKey = customerEmail.trim().toLowerCase();
    await rateLimiter.limit(ctx, "stashRedemptionIntent", {
      key: emailKey || walletAddress?.trim().toLowerCase() || String(programId),
      throws: true,
    });

    const program = await ctx.db.get(programId);
    if (!program || !program.active || !(program.redemptionEnabled ?? true)) {
      throw new Error("That token program is not available for .stash redemptions.");
    }
    if (!customerEmail.trim()) throw new Error("Email is required.");
    const minimumRedemptionTokens = program.minimumRedemptionTokens ?? 10;
    if (!Number.isFinite(amountTokens) || amountTokens < minimumRedemptionTokens) {
      throw new Error(`Minimum burn for this program is ${minimumRedemptionTokens} tokens.`);
    }

    const discountValueUsd = roundMoney(
      Math.min(amountTokens * program.discountPerTokenUsd, program.maxDiscountUsd),
    );
    if (discountValueUsd <= 0) {
      throw new Error("This burn amount does not produce a valid discount.");
    }

    const redemptionId = await ctx.db.insert("stashRedemptions", {
      programId,
      customerEmail: emailKey,
      walletAddress: walletAddress?.trim() || undefined,
      amountTokens,
      discountValueUsd,
      status: "awaiting_burn",
    });
    const redemption = await ctx.db.get(redemptionId);
    if (redemption) {
      await recordRedemptionMetric(ctx, redemption);
    }
    return redemptionId;
  },
});

export const issuePromotionCode = action({
  args: {
    redemptionId: v.id("stashRedemptions"),
    txHash: v.string(),
  },
  handler: async (
    ctx,
    { redemptionId, txHash },
  ): Promise<{ promotionCode: string; discountValueUsd: number; expiresAt?: number }> => {
    await rateLimiter.limit(ctx, "stashIssuePromotionCode", {
      key: String(redemptionId),
      throws: true,
    });

    const context = (await ctx.runQuery(internal.stash.redemptionContext, {
      redemptionId,
    })) as RedemptionContext | null;
    if (!context) throw new Error("Redemption not found.");
    if (context.status === "issued" && context.promotionCode) {
      return {
        promotionCode: context.promotionCode,
        discountValueUsd: context.discountValueUsd,
        expiresAt: context.expiresAt,
      };
    }
    if (context.status !== "awaiting_burn" && context.status !== "verified") {
      throw new Error(`Redemption is already ${context.status}.`);
    }

    await verifyBurnTransaction(txHash.trim(), context);

    const stripe = getStripe();
    const coupon = await stripe.coupons.create({
      amount_off: toUsdCents(context.discountValueUsd),
      currency: "usd",
      duration: "once",
      metadata: {
        redemptionId,
        programId: context.programId,
      },
      name: `${context.programName} .stash redemption`,
    });

    const expiresAt =
      Date.now() + (context.promotionCodeExpiresInDays ?? 14) * 24 * 60 * 60 * 1000;
    const promotionCode = await stripe.promotionCodes.create({
      promotion: {
        type: "coupon",
        coupon: coupon.id,
      },
      code: promotionCodeSlug(context.promotionCodePrefix, redemptionId),
      max_redemptions: 1,
      expires_at: Math.floor(expiresAt / 1000),
      metadata: {
        redemptionId,
        programId: context.programId,
      },
    });

    await ctx.runMutation(internal.stash.markIssued, {
      redemptionId,
      txHash,
      stripeCouponId: coupon.id,
      stripePromotionCodeId: promotionCode.id,
      promotionCode: promotionCode.code,
      expiresAt,
    });

    return {
      promotionCode: promotionCode.code,
      discountValueUsd: context.discountValueUsd,
      expiresAt,
    };
  },
});

export const redemptionContext = internalQuery({
  args: { redemptionId: v.id("stashRedemptions") },
  handler: async (ctx, { redemptionId }) => {
    const redemption = await ctx.db.get(redemptionId);
    if (!redemption) return null;
    const program = await ctx.db.get(redemption.programId);
    if (!program) return null;
    return {
      ...redemption,
      programName: program.projectName,
      programId: program._id,
      chain: program.chain,
      tokenKind: program.tokenKind,
      tokenAddress: program.tokenAddress,
      tokenDecimals: program.tokenDecimals ?? 18,
      burnTarget: program.burnTarget,
      burnMechanism: program.burnMechanism,
      promotionCodePrefix: program.promotionCodePrefix,
      promotionCodeExpiresInDays: program.promotionCodeExpiresInDays,
    };
  },
});

export const markIssued = internalMutation({
  args: {
    redemptionId: v.id("stashRedemptions"),
    txHash: v.string(),
    stripeCouponId: v.string(),
    stripePromotionCodeId: v.string(),
    promotionCode: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const oldRedemption = await ctx.db.get(args.redemptionId);
    await ctx.db.patch(args.redemptionId, {
      burnTxHash: args.txHash,
      stripeCouponId: args.stripeCouponId,
      stripePromotionCodeId: args.stripePromotionCodeId,
      promotionCode: args.promotionCode,
      expiresAt: args.expiresAt,
      status: "issued",
    });
    const newRedemption = await ctx.db.get(args.redemptionId);
    if (oldRedemption && newRedemption) {
      await replaceRedemptionMetric(ctx, oldRedemption, newRedemption);
    }
  },
});

export const markRedeemed = internalMutation({
  args: { redemptionId: v.id("stashRedemptions") },
  handler: async (ctx, { redemptionId }) => {
    const oldRedemption = await ctx.db.get(redemptionId);
    await ctx.db.patch(redemptionId, {
      status: "redeemed",
      redeemedAt: Date.now(),
    });
    const newRedemption = await ctx.db.get(redemptionId);
    if (oldRedemption && newRedemption) {
      await replaceRedemptionMetric(ctx, oldRedemption, newRedemption);
    }
  },
});

export const findIssuedCode = internalQuery({
  args: {
    promotionCode: v.string(),
    productProgramId: v.optional(v.id("tokenPrograms")),
  },
  handler: async (ctx, { promotionCode, productProgramId }) => {
    const redemption = await ctx.db
      .query("stashRedemptions")
      .withIndex("by_code", (q) => q.eq("promotionCode", promotionCode.toUpperCase()))
      .first();
    if (!redemption || redemption.status !== "issued") return null;
    if (redemption.expiresAt && redemption.expiresAt < Date.now()) return null;
    if (productProgramId && redemption.programId !== productProgramId) return null;
    return redemption;
  },
});

async function verifyBurnTransaction(
  txHash: string,
  context: {
    chain: "evm" | "solana";
    tokenKind: "native" | "erc20" | "spl";
    tokenAddress?: string;
    tokenDecimals: number;
    burnTarget: string;
    burnMechanism: "transfer_to_burn" | "contract_burn" | "manual_verify";
    amountTokens: number;
    walletAddress?: string;
  },
) {
  if (!txHash) throw new Error("Transaction hash is required.");
  if (context.burnMechanism === "manual_verify") {
    throw new Error("This token program requires manual burn verification in ops.");
  }
  if (context.chain !== "evm" || context.tokenKind !== "erc20" || !context.tokenAddress) {
    throw new Error("Self-serve .stash burn verification is currently available for EVM ERC-20 programs.");
  }
  if (context.burnMechanism !== "transfer_to_burn") {
    throw new Error("Only transfer-to-burn ERC-20 programs are currently supported in self-serve .stash.");
  }

  const rpcUrl =
    envValue("EVM_RPC_URL") ?? envValue("VITE_EVM_RPC_URL") ?? "https://mainnet.base.org";
  const [receipt, blockHex] = await Promise.all([
    rpcJson(rpcUrl, "eth_getTransactionReceipt", [txHash]),
    rpcJson(rpcUrl, "eth_blockNumber", []),
  ]);

  if (!receipt) throw new Error("Burn transaction not found onchain yet.");
  if (receipt.status === "0x0") throw new Error("Burn transaction reverted onchain.");

  const confirmations =
    receipt.blockNumber && blockHex
      ? Math.max(0, hexToInt(blockHex) - hexToInt(receipt.blockNumber) + 1)
      : 0;
  if (confirmations < 2) throw new Error("Burn transaction is still waiting on confirmations.");

  const expectedAmount = toTokenAtomic(context.amountTokens, context.tokenDecimals);
  const expectedTo = context.burnTarget.toLowerCase();
  const expectedFrom = context.walletAddress?.toLowerCase();
  const transferTopic =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55aeb3b3ef";

  const transfer = (receipt.logs ?? []).find((log: { address?: string; topics?: string[]; data?: string }) => {
    if ((log.address ?? "").toLowerCase() !== context.tokenAddress?.toLowerCase()) return false;
    if (!log.topics || log.topics.length < 3) return false;
    if ((log.topics[0] ?? "").toLowerCase() !== transferTopic) return false;
    if (topicToAddress(log.topics[2]) !== expectedTo) return false;
    if (BigInt(log.data ?? "0x0") < expectedAmount) return false;
    if (expectedFrom && topicToAddress(log.topics[1]) !== expectedFrom) return false;
    return true;
  });

  if (!transfer) {
    throw new Error("No matching token burn transfer was found in that transaction.");
  }
}

async function rpcJson(url: string, method: string, params: unknown[]) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${method}-${Date.now()}`,
      method,
      params,
    }),
  });
  if (!response.ok) {
    throw new Error(`RPC request failed for ${method} (${response.status}).`);
  }
  const body = await response.json();
  if (body.error) {
    throw new Error(body.error.message ?? `RPC error for ${method}.`);
  }
  return body.result;
}

function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return globalProcess.process?.env?.[key];
}

function hexToInt(value: string) {
  return parseInt(value, 16);
}

function topicToAddress(topic: string) {
  return `0x${topic.replace(/^0x/, "").slice(-40)}`.toLowerCase();
}

function toTokenAtomic(amount: number, decimals: number) {
  return BigInt(Math.round(amount * 10 ** decimals));
}

function toUsdCents(amount: number) {
  return Math.max(1, Math.round(amount * 100));
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
