import { v } from "convex/values";
import { action } from "./_generated/server";
import { createCustomProduct, getCustomProductOptions, listCatalogProducts, teemillConfig } from "./lib/teemill";

export const configStatus = action({
  args: {},
  handler: async () => {
    const config = teemillConfig();
    return {
      configured: config.configured,
      customProductConfigured: config.customProductConfigured,
      projectName: config.projectName ?? null,
      privateApiKeyConfigured: Boolean(config.privateApiKey),
      publicSafeKeyConfigured: Boolean(config.publicSafeKey),
    };
  },
});

export const catalogSmoke = action({
  args: {},
  handler: async () => {
    const products = await listCatalogProducts();
    return {
      ok: true,
      projectName: teemillConfig().projectName ?? null,
      productCount: products.length,
      sample: products.slice(0, 5).map((product) => ({
        id: product.id,
        title: product.title,
        slug: product.slug ?? null,
        variantCount: product.variants?.length ?? 0,
      })),
    };
  },
});

export const productOptions = action({
  args: {},
  handler: async () => {
    const options = await getCustomProductOptions();
    return {
      ok: true,
      options,
    };
  },
});

export const createCustomProductLink = action({
  args: {
    imageUrl: v.string(),
    itemCode: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    colours: v.optional(v.string()),
    price: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    if (!args.imageUrl.trim()) throw new Error("imageUrl is required.");
    if (args.price !== undefined && args.price <= 0) {
      throw new Error("price must be positive when provided.");
    }

    const result = await createCustomProduct({
      imageUrl: args.imageUrl.trim(),
      itemCode: args.itemCode?.trim() || undefined,
      name: args.name?.trim() || undefined,
      description: args.description?.trim() || undefined,
      colours: args.colours?.trim() || undefined,
      price: args.price,
    });

    return {
      ok: true,
      checkoutUrl: result.url,
      response: result.raw,
    };
  },
});
