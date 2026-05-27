import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./model/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "support", "finance", "readonly"]);
    const automations = await ctx.db.query("automations").collect();
    const runs = await ctx.db.query("automationRuns").collect();
    return automations
      .sort((a, b) => Number(b.active) - Number(a.active))
      .map((automation) => ({
        ...automation,
        runs: runs
          .filter((run) => run.automationId === automation._id)
          .sort((a, b) => b._creationTime - a._creationTime)
          .slice(0, 5),
      }));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    triggerType: v.string(),
    triggerConfigJson: v.optional(v.string()),
    stepsJson: v.optional(v.string()),
    active: v.boolean(),
  },
  handler: async (ctx, { name, triggerType, triggerConfigJson, stepsJson, active }) => {
    await requireRole(ctx, ["admin", "support"]);
    if (!name.trim()) throw new Error("Automation name is required.");
    if (!triggerType.trim()) throw new Error("Trigger type is required.");
    return await ctx.db.insert("automations", {
      name: name.trim(),
      active,
      trigger: {
        type: triggerType.trim(),
        config: parseJson(triggerConfigJson, "triggerConfigJson"),
      },
      steps: parseSteps(stepsJson),
    });
  },
});

export const setActive = mutation({
  args: {
    id: v.id("automations"),
    active: v.boolean(),
  },
  handler: async (ctx, { id, active }) => {
    await requireRole(ctx, ["admin", "support"]);
    const automation = await ctx.db.get(id);
    if (!automation) throw new Error("Automation not found.");
    await ctx.db.patch(id, { active });
  },
});

export const runNow = mutation({
  args: { id: v.id("automations") },
  handler: async (ctx, { id }) => {
    await requireRole(ctx, ["admin", "support"]);
    const automation = await ctx.db.get(id);
    if (!automation) throw new Error("Automation not found.");
    const now = Date.now();
    const runId = await ctx.db.insert("automationRuns", {
      automationId: id,
      status: "success",
      log: [
        { at: now, step: "trigger", detail: `Manual run started for ${automation.name}.` },
        { at: now + 1, step: "steps", detail: `${automation.steps.length} configured steps recorded.` },
      ],
    });
    return runId;
  },
});

function parseJson(value: string | undefined, field: string) {
  if (!value?.trim()) return {};
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${field} must be valid JSON.`);
  }
}

function parseSteps(value: string | undefined) {
  if (!value?.trim()) return [];
  const parsed = parseJson(value, "stepsJson");
  if (!Array.isArray(parsed)) {
    throw new Error("stepsJson must be a JSON array.");
  }
  return parsed.map((step) => ({
    kind:
      step?.kind === "condition" || step?.kind === "action" || step?.kind === "ai"
        ? step.kind
        : "action",
    config: step?.config ?? step ?? {},
  }));
}
