import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, requireUser } from "./model/auth";
import { chain } from "./schema";

const tokenKind = v.union(v.literal("native"), v.literal("erc20"), v.literal("spl"));
const burnMechanism = v.union(
  v.literal("transfer_to_burn"),
  v.literal("contract_burn"),
  v.literal("manual_verify"),
);

export const programs = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, { activeOnly }) => {
    await requireUser(ctx);
    const q = activeOnly
      ? ctx.db
          .query("tokenPrograms")
          .withIndex("by_active", (idx) => idx.eq("active", true))
      : ctx.db.query("tokenPrograms");
    return await q.collect();
  },
});

export const burns = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "finance", "support"]);
    const burns = await ctx.db.query("tokenBurns").collect();
    return await Promise.all(
      burns
        .sort((a, b) => b._creationTime - a._creationTime)
        .slice(0, 100)
        .map(async (burn) => {
          const order = await ctx.db.get(burn.orderId);
          const customer = await ctx.db.get(burn.customerId);
          const program = burn.programId ? await ctx.db.get(burn.programId) : null;
          return { ...burn, order, customer, program };
        }),
    );
  },
});

export const upsertProgram = mutation({
  args: {
    id: v.optional(v.id("tokenPrograms")),
    projectName: v.string(),
    tokenSymbol: v.string(),
    chain,
    tokenKind,
    tokenAddress: v.optional(v.string()),
    burnTarget: v.string(),
    burnMechanism,
    discountPerTokenUsd: v.number(),
    maxDiscountUsd: v.number(),
    active: v.boolean(),
    preDropNft: v.optional(
      v.object({
        enabled: v.boolean(),
        collectionName: v.string(),
        contractOrMint: v.optional(v.string()),
        mintPriceUsdc: v.number(),
        discountPercent: v.number(),
      }),
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...program }) => {
    await requireRole(ctx, ["admin", "finance", "catalog_manager"]);
    validateProgram(program);
    if (id) {
      const existing = await ctx.db.get(id);
      if (!existing) throw new Error("Token program not found.");
      await ctx.db.patch(id, program);
      return id;
    }
    return await ctx.db.insert("tokenPrograms", program);
  },
});

export const setBurnStatus = mutation({
  args: {
    burnId: v.id("tokenBurns"),
    status: v.union(v.literal("verified"), v.literal("failed")),
    burnTxHash: v.optional(v.string()),
  },
  handler: async (ctx, { burnId, status, burnTxHash }) => {
    await requireRole(ctx, ["admin", "finance", "support"]);
    const burn = await ctx.db.get(burnId);
    if (!burn) throw new Error("Token burn not found.");
    await ctx.db.patch(burnId, {
      status,
      burnTxHash,
      confirmedAt: status === "verified" ? Date.now() : undefined,
    });
    if (status === "verified") {
      const customer = await ctx.db.get(burn.customerId);
      if (customer) {
        await ctx.db.patch(burn.customerId, {
          tokensBurnedLifetime:
            customer.tokensBurnedLifetime + burn.amountTokens,
        });
      }
    }
  },
});

export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "finance", "catalog_manager"]);
    const existing = await ctx.db.query("tokenPrograms").collect();
    if (existing.some((program) => program.projectName === "Example Drop Token")) {
      return { seeded: false };
    }
    await ctx.db.insert("tokenPrograms", {
      projectName: "Example Drop Token",
      tokenSymbol: "DROP",
      chain: "evm",
      tokenKind: "erc20",
      tokenAddress: "0xDROp000000000000000000000000000000000000",
      burnTarget: "0x000000000000000000000000000000000000dEaD",
      burnMechanism: "transfer_to_burn",
      discountPerTokenUsd: 0.25,
      maxDiscountUsd: 35,
      active: true,
      preDropNft: {
        enabled: true,
        collectionName: ".cache Pre-drop Pass",
        contractOrMint: "0xPREdrop00000000000000000000000000000000",
        mintPriceUsdc: 18,
        discountPercent: 20,
      },
      notes: "Demo project token: burn DROP for merch discount or mint pre-drop pass.",
    });
    return { seeded: true };
  },
});

function validateProgram(program: {
  projectName: string;
  tokenSymbol: string;
  tokenKind: "native" | "erc20" | "spl";
  tokenAddress?: string;
  burnTarget: string;
  discountPerTokenUsd: number;
  maxDiscountUsd: number;
  preDropNft?: {
    enabled: boolean;
    collectionName: string;
    mintPriceUsdc: number;
    discountPercent: number;
  };
}) {
  if (!program.projectName.trim()) throw new Error("Project name is required.");
  if (!program.tokenSymbol.trim()) throw new Error("Token symbol is required.");
  if (program.tokenKind !== "native" && !program.tokenAddress?.trim()) {
    throw new Error("ERC-20/SPL programs require a token address.");
  }
  if (!program.burnTarget.trim()) throw new Error("Burn target is required.");
  if (!Number.isFinite(program.discountPerTokenUsd) || program.discountPerTokenUsd < 0) {
    throw new Error("discountPerTokenUsd must be non-negative.");
  }
  if (!Number.isFinite(program.maxDiscountUsd) || program.maxDiscountUsd < 0) {
    throw new Error("maxDiscountUsd must be non-negative.");
  }
  if (program.preDropNft?.enabled) {
    if (!program.preDropNft.collectionName.trim()) {
      throw new Error("Pre-drop NFT collection name is required.");
    }
    if (
      program.preDropNft.mintPriceUsdc < 0 ||
      program.preDropNft.discountPercent < 0 ||
      program.preDropNft.discountPercent > 100
    ) {
      throw new Error("Pre-drop NFT pricing/discount is invalid.");
    }
  }
}
