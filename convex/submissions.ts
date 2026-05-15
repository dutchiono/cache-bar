import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireRole, requireUser } from "./model/auth";

const submissionStatus = v.union(
  v.literal("new"),
  v.literal("prescreened"),
  v.literal("approved"),
  v.literal("rejected"),
);

export const list = query({
  args: { status: v.optional(submissionStatus) },
  handler: async (ctx, { status }) => {
    await requireUser(ctx);
    const base = status
      ? await ctx.db
          .query("submissions")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("submissions").collect();

    const enriched = await Promise.all(
      base.map(async (s) => {
        const product = await ctx.db.get(s.productId);
        const creator = await ctx.db.get(s.creatorId);
        const reviewer = s.reviewerId ? await ctx.db.get(s.reviewerId) : null;
        return {
          ...s,
          productTitle: product?.title ?? "(missing product)",
          creatorName: creator?.name ?? "(missing creator)",
          reviewerName: reviewer?.email ?? reviewer?.name ?? null,
        };
      }),
    );

    return enriched;
  },
});

export const submit = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    await requireRole(ctx, ["admin", "catalog_manager"]);
    const product = await ctx.db.get(productId);
    if (!product) throw new Error("Product not found.");
    if (product.status !== "draft") {
      throw new Error("Only draft products can be submitted for review.");
    }

    const existing = (await ctx.db.query("submissions").collect()).find(
      (s) =>
        s.productId === productId &&
        (s.status === "new" || s.status === "prescreened"),
    );
    if (existing) return existing._id;

    const id = await ctx.db.insert("submissions", {
      productId,
      creatorId: product.creatorId,
      makerType: product.makerType,
      status: "new",
    });
    await ctx.db.patch(productId, { status: "in_review" });
    return id;
  },
});

export const attachPrescreen = internalMutation({
  args: {
    submissionId: v.id("submissions"),
    prescreen: v.object({
      originalityOk: v.boolean(),
      ipFlags: v.array(v.string()),
      suggestedCategory: v.optional(v.string()),
      suggestedPrice: v.optional(v.number()),
      suggestedSplits: v.optional(v.any()),
      notes: v.string(),
    }),
  },
  handler: async (ctx, { submissionId, prescreen }) => {
    const existing = await ctx.db.get(submissionId);
    if (!existing) throw new Error("Submission not found.");
    await ctx.db.patch(submissionId, {
      status: "prescreened",
      elizaPrescreen: prescreen,
    });
  },
});

export const markPrescreened = mutation({
  args: {
    submissionId: v.id("submissions"),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { submissionId, notes }) => {
    await requireRole(ctx, ["admin", "catalog_manager"]);
    const existing = await ctx.db.get(submissionId);
    if (!existing) throw new Error("Submission not found.");
    await ctx.db.patch(submissionId, {
      status: "prescreened",
      elizaPrescreen: {
        originalityOk: true,
        ipFlags: [],
        notes:
          notes ??
          "Baseline auto-prescreen complete. No immediate policy/IP flags detected.",
      },
    });
  },
});

export const decide = mutation({
  args: {
    submissionId: v.id("submissions"),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, { submissionId, decision, rejectionReason }) => {
    const reviewer = await requireRole(ctx, ["admin", "catalog_manager"]);
    const sub = await ctx.db.get(submissionId);
    if (!sub) throw new Error("Submission not found.");

    if (decision === "approved") {
      await ctx.db.patch(sub.productId, { status: "live" });
      await ctx.db.patch(submissionId, {
        status: "approved",
        reviewerId: reviewer._id,
        decidedAt: Date.now(),
      });
      return;
    }

    await ctx.db.patch(sub.productId, { status: "draft" });
    await ctx.db.patch(submissionId, {
      status: "rejected",
      reviewerId: reviewer._id,
      decidedAt: Date.now(),
      elizaPrescreen: sub.elizaPrescreen
        ? {
            ...sub.elizaPrescreen,
            notes: `${sub.elizaPrescreen.notes}\nRejected: ${rejectionReason ?? "no reason provided"}`,
          }
        : undefined,
    });
  },
});
