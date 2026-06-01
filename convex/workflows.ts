import { vResultValidator } from "@convex-dev/workpool";
import { start, vWorkflowId, WorkflowManager, type WorkflowId } from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";
import { requireRole } from "./model/auth";

const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    defaultRetryBehavior: {
      maxAttempts: 5,
      initialBackoffMs: 30_000,
      base: 2,
    },
    retryActionsByDefault: true,
  },
});

export const reconcilePendingPayments = workflow
  .define({
    args: { limit: v.optional(v.number()) },
    returns: v.object({
      checked: v.number(),
      results: v.array(v.any()),
    }),
  })
  .handler(async (step, args): Promise<{ checked: number; results: unknown[] }> => {
    return await step.runAction(
      internal.payments.reconcilePendingPayments,
      { limit: args.limit ?? 25 },
      { retry: true },
    );
  });

export const startPaymentReconciliation = internalMutation({
  args: { limit: v.optional(v.number()), source: v.optional(v.string()) },
  handler: async (ctx, { limit, source }): Promise<WorkflowId> => {
    const workflowId = await start(
      ctx,
      internal.workflows.reconcilePendingPayments,
      { limit: limit ?? 25 },
      {
        onComplete: internal.workflows.recordWorkflowCompletion,
        context: {
          kind: "payment_reconciliation",
          source: source ?? "scheduled",
        },
      },
    );
    await ctx.db.insert("backendJobs", {
      kind: "payment_reconciliation",
      workflowId,
      status: "started",
      context: { limit: limit ?? 25, source: source ?? "scheduled" },
      startedAt: Date.now(),
    });
    return workflowId;
  },
});

export const recordWorkflowCompletion = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({
      kind: v.union(
        v.literal("payment_reconciliation"),
        v.literal("fulfillment_sync"),
        v.literal("eliza_shop_onboarding"),
        v.literal("email_delivery"),
        v.literal("metrics_backfill"),
      ),
      source: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { workflowId, result, context }) => {
    const existing = await ctx.db
      .query("backendJobs")
      .withIndex("by_workflow", (q) => q.eq("workflowId", workflowId))
      .first();
    const status =
      result.kind === "success" ? "success" : result.kind === "canceled" ? "canceled" : "error";
    const patch = {
      status,
      result,
      completedAt: Date.now(),
    } as const;
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return;
    }
    await ctx.db.insert("backendJobs", {
      kind: context.kind,
      workflowId,
      status,
      context,
      result,
      startedAt: Date.now(),
      completedAt: Date.now(),
    });
  },
});

export const recentJobs = query({
  args: {
    kind: v.optional(
      v.union(
        v.literal("payment_reconciliation"),
        v.literal("fulfillment_sync"),
        v.literal("eliza_shop_onboarding"),
        v.literal("email_delivery"),
        v.literal("metrics_backfill"),
      ),
    ),
  },
  handler: async (ctx, { kind }) => {
    await requireRole(ctx, ["admin", "finance", "support"]);
    const jobs = kind
      ? await ctx.db
          .query("backendJobs")
          .withIndex("by_kind", (q) => q.eq("kind", kind))
          .collect()
      : await ctx.db.query("backendJobs").collect();
    return jobs.sort((a, b) => b.startedAt - a.startedAt).slice(0, 50);
  },
});
