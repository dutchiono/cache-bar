import { v } from "convex/values";
import { action } from "./_generated/server";
import {
  createOrder,
  createQuote,
  getOrder,
  getProduct,
  lookupStickerCatalog,
  prodigiConfig,
  sandboxBaseUrl,
} from "./lib/prodigi";

export const configStatus = action({
  args: {},
  handler: async () => {
    const config = prodigiConfig();
    return {
      configured: config.configured,
      sandbox: config.sandbox,
      baseUrl: config.baseUrl,
      sandboxBaseUrl,
      apiKeyConfigured: Boolean(config.apiKey),
      mappedStickerCount: config.stickerSkus.filter((entry) => entry.prodigiSku).length,
      stickerSkus: config.stickerSkus,
    };
  },
});

export const stickerCatalogSmoke = action({
  args: {},
  handler: async () => {
    const lookups = await lookupStickerCatalog();
    return {
      ok: true,
      configured: prodigiConfig().configured,
      mappedCount: lookups.filter((entry) => entry.prodigiSku).length,
      reachableCount: lookups.filter((entry) => entry.reachable).length,
      stickers: lookups,
    };
  },
});

export const productLookup = action({
  args: {
    sku: v.string(),
  },
  handler: async (_ctx, args) => {
    if (!args.sku.trim()) throw new Error("sku is required.");
    const product = await getProduct(args.sku.trim());
    return { ok: true, product };
  },
});

export const quoteCreate = action({
  args: {
    destinationCountryCode: v.string(),
    currencyCode: v.optional(v.string()),
    shippingMethod: v.optional(v.string()),
    items: v.array(
      v.object({
        sku: v.string(),
        copies: v.number(),
        attributes: v.optional(v.record(v.string(), v.string())),
        assets: v.optional(
          v.array(
            v.object({
              printArea: v.string(),
              url: v.optional(v.string()),
            }),
          ),
        ),
      }),
    ),
  },
  handler: async (_ctx, args) => {
    if (!args.destinationCountryCode.trim()) {
      throw new Error("destinationCountryCode is required.");
    }
    if (args.items.length === 0) throw new Error("items is required.");
    const quote = await createQuote({
      destinationCountryCode: args.destinationCountryCode.trim(),
      currencyCode: args.currencyCode?.trim() || undefined,
      shippingMethod: args.shippingMethod?.trim() || undefined,
      items: args.items,
    });
    return { ok: true, quote };
  },
});

export const orderCreate = action({
  args: {
    merchantReference: v.string(),
    idempotencyKey: v.string(),
    shippingMethod: v.string(),
    recipient: v.object({
      name: v.string(),
      email: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
      address: v.object({
        line1: v.string(),
        line2: v.optional(v.string()),
        postalOrZipCode: v.string(),
        countryCode: v.string(),
        townOrCity: v.string(),
        stateOrCounty: v.optional(v.string()),
      }),
    }),
    items: v.array(
      v.object({
        merchantReference: v.optional(v.string()),
        sku: v.string(),
        copies: v.number(),
        sizing: v.optional(v.string()),
        attributes: v.optional(v.record(v.string(), v.string())),
        assets: v.array(
          v.object({
            printArea: v.string(),
            url: v.string(),
          }),
        ),
      }),
    ),
    metadata: v.optional(v.record(v.string(), v.any())),
    callbackUrl: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const order = await createOrder(args);
    return { ok: true, order };
  },
});

export const orderLookup = action({
  args: {
    orderId: v.string(),
  },
  handler: async (_ctx, args) => {
    if (!args.orderId.trim()) throw new Error("orderId is required.");
    const order = await getOrder(args.orderId.trim());
    return { ok: true, order };
  },
});
