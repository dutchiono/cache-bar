import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  FOUNDRY_DEMO_PROVISIONING_STEPS,
  FOUNDRY_DEMO_RATE_LIMIT_MAX_LAUNCHES,
  FOUNDRY_DEMO_RATE_LIMIT_WINDOW_MS,
  FOUNDRY_DEMO_RETENTION_MS,
  foundryDemoCapabilitySummary,
  foundryDemoLaunchFingerprint,
  foundryDemoLaunchSlug,
  normalizeFoundryDemoLaunch,
  validateFoundryDemoIdempotencyKey,
} from "../platform/foundry/demoPolicy";

const fixtureAgents = [
  {
    publicId: "fixture-cache",
    slug: "cache",
    name: ".cache",
    ticker: "CACHE",
    status: "selling",
    market: "CACHE / PLATFORM",
    installedLead: "commerce",
    computeBuffer: "$28.14",
    source: "fixture",
  },
  {
    publicId: "fixture-trade",
    slug: "trading-machine",
    name: "Trading Machine",
    ticker: "TRADE",
    status: "proposing",
    market: "TRADE / PLATFORM",
    installedLead: "solana analysis",
    computeBuffer: "$20 target",
    source: "fixture",
  },
  {
    publicId: "fixture-miono",
    slug: "miono",
    name: "Miono",
    ticker: "MIONO",
    status: "learning",
    market: "MIONO / PLATFORM",
    installedLead: "runtime ops",
    computeBuffer: "$20 target",
    source: "fixture",
  },
] as const;

export const listNetwork = internalQuery({
  args: {},
  handler: async (ctx) => {
    const launches = await ctx.db
      .query("foundryDemoLaunches")
      .withIndex("by_created_at")
      .order("desc")
      .take(6);
    return {
      agents: [...launches.map(publicNetworkAgent), ...fixtureAgents],
      generatedAt: Date.now(),
      source: "convex-demo-control-plane",
    };
  },
});

export const createLaunch = internalMutation({
  args: {
    name: v.string(),
    ticker: v.string(),
    capabilities: v.array(v.string()),
    idempotencyKey: v.string(),
    visitorFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const launchInput = normalizeFoundryDemoLaunch(args);
    const idempotencyKey = validateFoundryDemoIdempotencyKey(args.idempotencyKey);
    const requestFingerprint = foundryDemoLaunchFingerprint(launchInput);
    const existing = await ctx.db
      .query("foundryDemoLaunches")
      .withIndex("by_idempotency", (q) => q.eq("idempotencyKey", idempotencyKey))
      .first();
    if (existing) {
      if (existing.requestFingerprint !== requestFingerprint) {
        throw new Error("Idempotency key already belongs to a different demo launch.");
      }
      return await launchResponse(ctx, existing);
    }

    const now = Date.now();
    await pruneExpiredDemoData(ctx, now);
    await consumeRateLimit(ctx, args.visitorFingerprint, now);
    const slug = foundryDemoLaunchSlug(launchInput.ticker, idempotencyKey);
    const publicId = `demo-${slug}`;
    const launchId = await ctx.db.insert("foundryDemoLaunches", {
      publicId,
      idempotencyKey,
      requestFingerprint,
      slug,
      name: launchInput.name,
      ticker: launchInput.ticker,
      capabilities: launchInput.capabilities,
      status: "online",
      market: `${launchInput.ticker} / PLATFORM`,
      installedLead: foundryDemoCapabilitySummary(launchInput.capabilities),
      computeBuffer: "$20 target",
      runtimePath: `/agents/${slug}`,
      createdAt: now,
      updatedAt: now,
    });
    for (const [sequence, detail] of FOUNDRY_DEMO_PROVISIONING_STEPS.entries()) {
      await ctx.db.insert("foundryDemoAuditEvents", {
        launchId,
        sequence,
        detail,
        at: now + sequence,
      });
    }
    const inserted = await ctx.db.get(launchId);
    if (!inserted) throw new Error("Foundry demo launch insert failed.");
    return await launchResponse(ctx, inserted);
  },
});

export const readLaunch = internalQuery({
  args: { publicId: v.string() },
  handler: async (ctx, { publicId }) => {
    const launch = await ctx.db
      .query("foundryDemoLaunches")
      .withIndex("by_public_id", (q) => q.eq("publicId", publicId))
      .first();
    return launch ? await launchResponse(ctx, launch) : null;
  },
});

async function launchResponse(
  ctx: Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">,
  launch: Doc<"foundryDemoLaunches">,
) {
  const auditEvents = await ctx.db
    .query("foundryDemoAuditEvents")
    .withIndex("by_launch_sequence", (q) => q.eq("launchId", launch._id))
    .collect();
  return {
    launch: {
      ...publicNetworkAgent(launch),
      capabilities: launch.capabilities,
      runtimePath: launch.runtimePath,
      createdAt: launch.createdAt,
    },
    auditEvents: auditEvents.map((event) => ({
      sequence: event.sequence,
      detail: event.detail,
      at: event.at,
    })),
  };
}

function publicNetworkAgent(launch: Doc<"foundryDemoLaunches">) {
  return {
    publicId: launch.publicId,
    slug: launch.slug,
    name: launch.name,
    ticker: launch.ticker,
    status: launch.status,
    market: launch.market,
    installedLead: launch.installedLead,
    computeBuffer: launch.computeBuffer,
    source: "durable simulation",
  };
}

async function consumeRateLimit(ctx: MutationCtx, key: string, now: number) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error("Visitor fingerprint is invalid.");
  const existing = await ctx.db
    .query("foundryDemoRateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (!existing) {
    await ctx.db.insert("foundryDemoRateLimits", { key, windowStartedAt: now, count: 1 });
    return;
  }
  if (now - existing.windowStartedAt >= FOUNDRY_DEMO_RATE_LIMIT_WINDOW_MS) {
    await ctx.db.patch(existing._id, { windowStartedAt: now, count: 1 });
    return;
  }
  if (existing.count >= FOUNDRY_DEMO_RATE_LIMIT_MAX_LAUNCHES) {
    throw new Error("Demo launch rate limit reached. Try again later.");
  }
  await ctx.db.patch(existing._id, { count: existing.count + 1 });
}

async function pruneExpiredDemoData(ctx: MutationCtx, now: number) {
  const cutoff = now - FOUNDRY_DEMO_RETENTION_MS;
  const staleLaunches = await ctx.db
    .query("foundryDemoLaunches")
    .withIndex("by_created_at", (q) => q.lt("createdAt", cutoff))
    .take(12);
  for (const launch of staleLaunches) {
    const events = await ctx.db
      .query("foundryDemoAuditEvents")
      .withIndex("by_launch_sequence", (q) => q.eq("launchId", launch._id))
      .collect();
    for (const event of events) await ctx.db.delete(event._id);
    await ctx.db.delete(launch._id);
  }
  const staleLimits = await ctx.db
    .query("foundryDemoRateLimits")
    .withIndex("by_window_started_at", (q) => q.lt("windowStartedAt", cutoff))
    .take(12);
  for (const limit of staleLimits) await ctx.db.delete(limit._id);
}
