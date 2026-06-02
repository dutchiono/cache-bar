import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";

const shippingAddressArg = v.object({
  line1: v.string(),
  line2: v.optional(v.string()),
  city: v.string(),
  region: v.string(),
  postalCode: v.string(),
  country: v.string(),
});

const paymentNetwork = v.union(v.literal("base"), v.literal("solana"));
const paymentAssetCode = v.union(v.literal("usdc"), v.literal("eth"), v.literal("sol"));
const quoteLifetimeMs = 10 * 60 * 1000;

type WalletPaymentIntentResult = {
  orderId: Id<"orders">;
  paymentId: Id<"payments">;
  total: number;
  burnDiscount: number;
  tokensSpentBurned: number;
  rail: "crypto" | "usdc" | "x402";
  instruction: {
    network: string;
    asset: string;
    payTo: string;
    amount: string;
    amountAtomic: string;
    assetCode: "usdc" | "eth" | "sol";
  };
  x402: null | {
    scheme: string;
    network: string;
    asset: string;
    payTo: string;
    facilitatorUrl: string;
    resource: string;
    paymentId: string;
    price: string;
    description: string;
  };
};

export const createPaymentIntent = action({
  args: {
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(),
    customerName: v.string(),
    customerEmail: v.string(),
    shippingAddress: v.optional(shippingAddressArg),
    network: paymentNetwork,
    assetCode: paymentAssetCode,
    fromAddress: v.string(),
  },
  handler: async (ctx, args): Promise<WalletPaymentIntentResult> => {
    const nativeUsdRate =
      args.assetCode === "usdc"
        ? undefined
        : await fetchCoinbaseSpotPrice(args.assetCode);
    return await ctx.runMutation(internal.checkout.createQuotedWalletPaymentIntent, {
      ...args,
      rail: "crypto",
      nativeUsdRate,
      quoteExpiresAt: Date.now() + quoteLifetimeMs,
    });
  },
});

async function fetchCoinbaseSpotPrice(assetCode: "eth" | "sol") {
  const response = await fetch(
    `https://api.coinbase.com/v2/prices/${assetCode.toUpperCase()}-USD/spot`,
  );
  if (!response.ok) {
    throw new Error(`Unable to quote ${assetCode.toUpperCase()} checkout right now.`);
  }
  const body = (await response.json()) as {
    data?: { amount?: string };
  };
  const rate = Number(body.data?.amount);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Coinbase returned an invalid ${assetCode.toUpperCase()} quote.`);
  }
  return rate;
}
