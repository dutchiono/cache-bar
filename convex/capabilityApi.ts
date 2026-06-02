import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireRole } from "./model/auth";
import {
  CACHEBAR_CAPABILITY_ID,
  cachebarProposalFingerprint,
  validateCachebarProposal,
} from "../platform/capabilities/cachebar/policy";

const proposalAction = v.union(v.literal("product-draft"), v.literal("fulfillment-support"));
const proposalStatus = v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected"));

export const readCatalog = internalQuery({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .collect();
    return await Promise.all(
      products.map(async (product) => {
        const creator = await ctx.db.get(product.creatorId);
        const variants = await ctx.db
          .query("productVariants")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .collect();
        return {
          id: product._id,
          title: product.title,
          description: product.description,
          productType: product.productType,
          category: product.category,
          basePrice: product.basePrice,
          currency: product.currency,
          demoImageUrls: product.demoImageUrls ?? [],
          tokenDiscountEligible: product.tokenDiscountEligible,
          creator: creator
            ? {
                name: creator.name,
                type: creator.type,
                agentId: creator.agentId,
              }
            : null,
          variants: await Promise.all(
            variants.map(async (variant) => {
              const inventory = await ctx.db
                .query("inventory")
                .withIndex("by_variant", (q) => q.eq("variantId", variant._id))
                .first();
              return {
                id: variant._id,
                sku: variant.sku,
                optionLabel: variant.optionLabel,
                priceOverride: variant.priceOverride,
                available: inventory ? Math.max(0, inventory.onHand - inventory.reserved) : null,
              };
            }),
          ),
        };
      }),
    );
  },
});

export const createProposal = internalMutation({
  args: {
    agentId: v.string(),
    idempotencyKey: v.string(),
    action: proposalAction,
    payload: v.any(),
    requestFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const proposal = validateCachebarProposal({
      action: args.action,
      body: args.payload,
    });
    const expectedFingerprint = cachebarProposalFingerprint(args.agentId, proposal);
    if (expectedFingerprint !== args.requestFingerprint) {
      throw new Error("Proposal fingerprint mismatch.");
    }
    const existing = await ctx.db
      .query("capabilityProposals")
      .withIndex("by_agent_idempotency", (q) =>
        q.eq("agentId", args.agentId).eq("idempotencyKey", args.idempotencyKey),
      )
      .first();
    if (existing) {
      if (existing.requestFingerprint !== expectedFingerprint) {
        throw new Error("Idempotency key already belongs to a different proposal.");
      }
      return publicProposal(existing);
    }
    const proposalId = await ctx.db.insert("capabilityProposals", {
      capabilityId: CACHEBAR_CAPABILITY_ID,
      agentId: args.agentId,
      idempotencyKey: args.idempotencyKey,
      requestFingerprint: expectedFingerprint,
      action: proposal.action,
      payload: proposal.body,
      status: "pending",
      requestedAt: Date.now(),
    });
    const inserted = await ctx.db.get(proposalId);
    if (!inserted) throw new Error("Proposal insert failed.");
    return publicProposal(inserted);
  },
});

export const readProposal = internalQuery({
  args: {
    agentId: v.string(),
    proposalId: v.id("capabilityProposals"),
  },
  handler: async (ctx, { agentId, proposalId }) => {
    const proposal = await ctx.db.get(proposalId);
    if (!proposal || proposal.agentId !== agentId) return null;
    return publicProposal(proposal);
  },
});

export const listProposals = query({
  args: { status: v.optional(proposalStatus) },
  handler: async (ctx, { status }) => {
    await requireRole(ctx, ["admin", "catalog_manager", "fulfillment", "support", "readonly"]);
    const proposals = status
      ? await ctx.db
          .query("capabilityProposals")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("capabilityProposals").collect();
    return proposals.sort((left, right) => right.requestedAt - left.requestedAt);
  },
});

export const decideProposal = mutation({
  args: {
    proposalId: v.id("capabilityProposals"),
    decision: v.union(v.literal("accepted"), v.literal("rejected")),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, { proposalId, decision, reviewNotes }) => {
    const reviewer = await requireRole(ctx, ["admin", "catalog_manager", "fulfillment"]);
    const proposal = await ctx.db.get(proposalId);
    if (!proposal) throw new Error("Capability proposal not found.");
    if (proposal.status !== "pending") {
      throw new Error("Only pending capability proposals can be reviewed.");
    }
    await ctx.db.patch(proposalId, {
      status: decision,
      reviewedByUserId: reviewer._id,
      reviewedAt: Date.now(),
      reviewNotes: reviewNotes?.trim() || undefined,
    });
  },
});

function publicProposal(proposal: {
  _id: unknown;
  capabilityId: string;
  agentId: string;
  action: "product-draft" | "fulfillment-support";
  payload: unknown;
  status: "pending" | "accepted" | "rejected";
  requestedAt: number;
  reviewedAt?: number;
  reviewNotes?: string;
}) {
  return {
    id: proposal._id,
    capabilityId: proposal.capabilityId,
    agentId: proposal.agentId,
    action: proposal.action,
    payload: proposal.payload,
    status: proposal.status,
    requestedAt: proposal.requestedAt,
    reviewedAt: proposal.reviewedAt,
    reviewNotes: proposal.reviewNotes,
  };
}
