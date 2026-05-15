import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireRole, requireUser } from "./model/auth";
import { makerType } from "./schema";

const provenanceArg = v.object({
  makerType,
  summary: v.string(),
  baseModel: v.optional(v.string()),
  provider: v.optional(v.string()),
  brief: v.optional(v.string()),
  seed: v.optional(v.string()),
  runId: v.optional(v.string()),
  generatedAt: v.optional(v.number()),
  license: v.optional(v.string()),
});

const royaltySplitsArg = v.array(
  v.object({
    payeeCreatorId: v.optional(v.id("creators")),
    role: v.string(),
    percent: v.number(),
  }),
);

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("in_review"),
        v.literal("approved"),
        v.literal("live"),
        v.literal("retired"),
      ),
    ),
    makerType: v.optional(makerType),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { status, makerType: mt, category }) => {
    await requireUser(ctx);
    let q;
    if (status) {
      q = ctx.db.query("products").withIndex("by_status", (q) => q.eq("status", status));
    } else if (mt) {
      q = ctx.db.query("products").withIndex("by_makerType", (q) => q.eq("makerType", mt));
    } else if (category) {
      q = ctx.db.query("products").withIndex("by_category", (q) => q.eq("category", category));
    } else {
      q = ctx.db.query("products");
    }
    return await q.collect();
  },
});

export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    const product = await ctx.db.get(id);
    if (!product) return null;
    const creator = await ctx.db.get(product.creatorId);
    return { ...product, creator };
  },
});

export const createDraft = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    productType: v.union(v.literal("physical"), v.literal("digital")),
    category: v.string(),
    creatorId: v.id("creators"),
    basePrice: v.number(),
    currency: v.string(),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    demoImageUrls: v.optional(v.array(v.string())),
    tokenDiscountEligible: v.boolean(),
    provenance: provenanceArg,
    royaltySplits: royaltySplitsArg,
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "catalog_manager"]);
    const creator = await ctx.db.get(args.creatorId);
    if (!creator) throw new Error("Creator not found.");

    // makerType is derived from the creator — not user-supplied — so a "human-made"
    // product can't be filed under an agent creator (or vice versa).
    const derivedMakerType = creator.type;
    validateProvenance(derivedMakerType, args.provenance);
    validateSplits(args.royaltySplits);

    return await ctx.db.insert("products", {
      title: args.title,
      description: args.description,
      productType: args.productType,
      category: args.category,
      makerType: derivedMakerType,
      creatorId: args.creatorId,
      status: "draft",
      basePrice: args.basePrice,
      currency: args.currency,
      imageStorageIds: args.imageStorageIds ?? [],
      demoImageUrls: args.demoImageUrls ?? [],
      tokenDiscountEligible: args.tokenDiscountEligible,
      provenance: { ...args.provenance, makerType: derivedMakerType },
      royaltySplits: args.royaltySplits,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    basePrice: v.optional(v.number()),
    currency: v.optional(v.string()),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    demoImageUrls: v.optional(v.array(v.string())),
    tokenDiscountEligible: v.optional(v.boolean()),
    provenance: v.optional(provenanceArg),
    royaltySplits: v.optional(royaltySplitsArg),
  },
  handler: async (ctx, { id, ...patch }) => {
    await requireRole(ctx, ["admin", "catalog_manager"]);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Product not found.");

    if (patch.provenance) {
      validateProvenance(existing.makerType, patch.provenance);
      patch.provenance = { ...patch.provenance, makerType: existing.makerType };
    }
    if (patch.royaltySplits) {
      validateSplits(patch.royaltySplits);
    }
    await ctx.db.patch(id, patch);
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("products"),
    status: v.union(
      v.literal("draft"),
      v.literal("in_review"),
      v.literal("approved"),
      v.literal("live"),
      v.literal("retired"),
    ),
  },
  handler: async (ctx, { id, status }) => {
    await requireRole(ctx, ["admin", "catalog_manager"]);
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Product not found.");

    // Re-run validators on the live transition — guards against partial edits
    // somehow slipping past createDraft/update.
    if (status === "live" || status === "approved") {
      validateProvenance(existing.makerType, existing.provenance);
      validateSplits(existing.royaltySplits);
    }
    await ctx.db.patch(id, { status });
  },
});

export const seedVisionDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireRole(ctx, ["admin", "catalog_manager"]);

    const creators = await ctx.db.query("creators").collect();
    let demoCreator = creators.find((c) => c.agentId === "waifu.fun/v2.0.0");
    if (!demoCreator) {
      const creatorId = await ctx.db.insert("creators", {
        name: "WAIFU.FUN // Image Protocol",
        type: "agent",
        status: "active",
        agentId: "waifu.fun/v2.0.0",
        baseModel: "milady-ai/streetwear-gen",
        operatorUserId: me._id,
        reinvestPercent: 100,
        capabilities: ["lookbook", "drop-copy", "merch-variant-ideation"],
        payoutMethod: {
          kind: "usdc_wallet",
          chain: "evm",
          address: "0xDEMO000000000000000000000000000000W41FU",
        },
      });
      demoCreator = (await ctx.db.get(creatorId))!;
    }

    const title = "WAIFU.FUN v2.0.0 // Statement Tee";
    const existing = (await ctx.db.query("products").collect()).find((p) => p.title === title);
    if (existing) return existing._id;

    return await ctx.db.insert("products", {
      title,
      description:
        "Oversized washed-black heavyweight tee with front/back full-print anime-core composition. Visual direction: dark internet protocol, pink accent system, high-density ink treatment, boxed fit.",
      productType: "physical",
      category: "tees",
      makerType: "agent",
      creatorId: demoCreator._id,
      status: "draft",
      basePrice: 69,
      currency: "USD",
      imageStorageIds: [],
      demoImageUrls: ["/images/waifu.png", "/images/image.png"],
      tokenDiscountEligible: true,
      provenance: {
        makerType: "agent",
        summary:
          "Agent-created visual system derived from waifu.fun / elizaOS capsule references.",
        baseModel: "milady-ai/streetwear-gen",
        provider: "Eliza creator agent",
        brief:
          "Create a washed-black, oversized, 280gsm tee with front/back narrative print and pink-glitch accent language.",
        seed: "WF-0007",
        runId: "vision-seed-waifu-fun-v2",
        generatedAt: Date.now(),
        license: "internal demo use",
      },
      royaltySplits: [
        { role: "creator", percent: 90, payeeCreatorId: demoCreator._id },
        { role: "platform", percent: 10 },
      ],
    });
  },
});

// ---------- validators ----------

function validateProvenance(
  makerTypeValue: "human" | "agent",
  prov: {
    makerType: "human" | "agent";
    summary: string;
    baseModel?: string;
    provider?: string;
    brief?: string;
    seed?: string;
    runId?: string;
    generatedAt?: number;
    license?: string;
  },
) {
  if (prov.makerType !== makerTypeValue) {
    throw new Error(
      `provenance.makerType (${prov.makerType}) must match the creator's makerType (${makerTypeValue}).`,
    );
  }
  if (!prov.summary?.trim()) {
    throw new Error("provenance.summary is required.");
  }
  if (makerTypeValue === "agent") {
    const required = ["baseModel", "provider", "brief", "seed", "runId", "generatedAt", "license"] as const;
    const missing = required.filter((k) => prov[k] === undefined || prov[k] === "");
    if (missing.length > 0) {
      throw new Error(
        `Agent-made products require complete provenance — missing: ${missing.join(", ")}.`,
      );
    }
  }
}

function validateSplits(
  splits: { payeeCreatorId?: Id<"creators">; role: string; percent: number }[],
) {
  if (splits.length === 0) {
    throw new Error("royaltySplits must contain at least one entry.");
  }
  for (const s of splits) {
    if (!s.role?.trim()) throw new Error("Each split needs a non-empty role.");
    if (s.percent < 0) throw new Error("Split percent cannot be negative.");
  }
  // Sum in hundredths to avoid float drift; final must equal exactly 100.00%.
  const sumHundredths = splits.reduce(
    (acc, s) => acc + Math.round(s.percent * 100),
    0,
  );
  if (sumHundredths !== 10000) {
    throw new Error(
      `royaltySplits must sum to exactly 100% (got ${(sumHundredths / 100).toFixed(2)}%).`,
    );
  }
}
