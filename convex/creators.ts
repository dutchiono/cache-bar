import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, requireUser } from "./model/auth";
import { chain, makerType } from "./schema";

const payoutMethodArg = v.object({
  kind: v.union(v.literal("bank"), v.literal("usdc_wallet")),
  chain: v.optional(chain),
  address: v.optional(v.string()),
  bankRef: v.optional(v.string()),
});

export const list = query({
  args: {
    type: v.optional(makerType),
    status: v.optional(v.union(v.literal("active"), v.literal("paused"))),
  },
  handler: async (ctx, { type, status }) => {
    await requireUser(ctx);
    if (type) {
      return await ctx.db
        .query("creators")
        .withIndex("by_type", (q) => q.eq("type", type))
        .filter((q) =>
          status ? q.eq(q.field("status"), status) : q.eq(q.field("status"), q.field("status")),
        )
        .collect();
    }
    if (status) {
      return await ctx.db
        .query("creators")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
    }
    return await ctx.db.query("creators").collect();
  },
});

export const get = query({
  args: { id: v.id("creators") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    return await ctx.db.get(id);
  },
});

export const createHumanCreator = mutation({
  args: {
    name: v.string(),
    payoutMethod: payoutMethodArg,
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "catalog_manager"]);
    validatePayoutMethod(args.payoutMethod);
    return await ctx.db.insert("creators", {
      name: args.name,
      type: "human",
      status: "active",
      payoutMethod: args.payoutMethod,
    });
  },
});

export const registerAgentCreator = mutation({
  args: {
    name: v.string(),
    agentId: v.string(),
    baseModel: v.string(),
    operatorUserId: v.id("users"),
    reinvestPercent: v.number(),
    capabilities: v.optional(v.array(v.string())),
    payoutMethod: payoutMethodArg,
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    if (args.reinvestPercent < 0 || args.reinvestPercent > 100) {
      throw new Error("reinvestPercent must be 0–100.");
    }
    if (args.payoutMethod.kind !== "usdc_wallet") {
      throw new Error("Agent creators are paid via usdc_wallet.");
    }
    validatePayoutMethod(args.payoutMethod);
    return await ctx.db.insert("creators", {
      name: args.name,
      type: "agent",
      status: "active",
      agentId: args.agentId,
      baseModel: args.baseModel,
      operatorUserId: args.operatorUserId,
      reinvestPercent: args.reinvestPercent,
      capabilities: args.capabilities ?? [],
      payoutMethod: args.payoutMethod,
    });
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("creators"),
    status: v.union(v.literal("active"), v.literal("paused")),
  },
  handler: async (ctx, { id, status }) => {
    await requireRole(ctx, ["admin", "catalog_manager"]);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Creator not found.");
    await ctx.db.patch(id, { status });
  },
});

export const setPayoutMethod = mutation({
  args: {
    id: v.id("creators"),
    payoutMethod: payoutMethodArg,
  },
  handler: async (ctx, { id, payoutMethod }) => {
    await requireRole(ctx, ["admin", "finance"]);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Creator not found.");
    if (existing.type === "agent" && payoutMethod.kind !== "usdc_wallet") {
      throw new Error("Agent creators must use usdc_wallet payout.");
    }
    validatePayoutMethod(payoutMethod);
    await ctx.db.patch(id, { payoutMethod });
  },
});

function validatePayoutMethod(pm: {
  kind: "bank" | "usdc_wallet";
  chain?: "evm" | "solana";
  address?: string;
  bankRef?: string;
}) {
  if (pm.kind === "usdc_wallet") {
    if (!pm.chain) throw new Error("usdc_wallet payout requires `chain`.");
    if (!pm.address) throw new Error("usdc_wallet payout requires `address`.");
  } else if (pm.kind === "bank") {
    if (!pm.bankRef) throw new Error("bank payout requires `bankRef`.");
  }
}
