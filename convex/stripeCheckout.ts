import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { appBaseUrl, envValue, getStripe } from "./lib/stripe";

const shippingCountries = [
  "US",
  "CA",
  "GB",
  "AU",
  "NZ",
  "DE",
  "FR",
  "NL",
  "BE",
  "ES",
  "IT",
  "PT",
  "IE",
  "SE",
  "NO",
  "DK",
  "FI",
  "JP",
  "SG",
];

type CheckoutSelection = {
  product: {
    _id: Id<"products">;
    title: string;
    basePrice: number;
    productType: "physical" | "digital";
    tokenDiscountEligible: boolean;
    tokenProgramId?: Id<"tokenPrograms">;
    demoImageUrls?: string[];
  };
  variant: null | {
    _id: Id<"productVariants">;
    priceOverride?: number;
    optionLabel: string;
  };
  tokenProgram: null | {
    _id: Id<"tokenPrograms">;
  };
};

type StripeDraft = {
  orderId: Id<"orders">;
  paymentId: Id<"payments">;
  orderNumber: string;
  productTitle: string;
  variantLabel?: string;
  subtotal: number;
  shipping: number;
  discountValueUsd: number;
  total: number;
  stashRedemptionId?: Id<"stashRedemptions">;
};

type StripeSessionResult = {
  sessionId: string;
  orderId: Id<"orders">;
  orderNumber: string;
  checkoutUrl: string | null;
};

export const createSession = action({
  args: {
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    quantity: v.number(),
    customerName: v.string(),
    customerEmail: v.string(),
    stashCode: v.optional(v.string()),
    origin: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<StripeSessionResult> => {
    const selection = (await ctx.runQuery(internal.checkout.checkoutSelectionContext, {
      productId: args.productId,
      variantId: args.variantId,
    })) as CheckoutSelection | null;
    if (!selection) throw new Error("Product selection is invalid.");

    const { product, variant } = selection;
    const normalizedCode = args.stashCode?.trim().toUpperCase() || undefined;
    let redemption:
      | {
          _id: Id<"stashRedemptions">;
          discountValueUsd: number;
          stripePromotionCodeId?: string;
        }
      | null = null;

    if (normalizedCode) {
      const productProgramId = product.tokenProgramId ?? selection.tokenProgram?._id;
      if (!product.tokenDiscountEligible || !productProgramId) {
        throw new Error("This product does not accept a .stash discount code.");
      }
      redemption = await ctx.runQuery(internal.stash.findIssuedCode, {
        promotionCode: normalizedCode,
        productProgramId,
      });
      if (!redemption?.stripePromotionCodeId) {
        throw new Error("That .stash code is invalid, expired, or already used.");
      }
    }

    let draft: StripeDraft | null = null;

    try {
      draft = (await ctx.runMutation(internal.checkout.createStripeCheckoutDraft, {
        productId: product._id,
        variantId: variant?._id,
        quantity: args.quantity,
        customerName: args.customerName,
        customerEmail: args.customerEmail,
        stashRedemptionId: redemption?._id,
        discountValueUsd: redemption?.discountValueUsd,
      })) as StripeDraft;

      const stripe = getStripe();
      const origin = normalizeOrigin(args.origin);
      const lineItems = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: draft.productTitle,
              description: draft.variantLabel ? `Variant: ${draft.variantLabel}` : undefined,
              images: product.demoImageUrls?.slice(0, 1) ?? [],
            },
            unit_amount: toUsdCents((variant?.priceOverride ?? product.basePrice) || 0),
          },
          quantity: args.quantity,
        },
      ];

      if (draft.shipping > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Shipping",
              description: "Physical order delivery",
              images: [],
            },
            unit_amount: toUsdCents(draft.shipping),
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout?product=${product._id}${variant?._id ? `&variant=${variant._id}` : ""}&quantity=${args.quantity}`,
        line_items: lineItems,
        discounts: redemption?.stripePromotionCodeId
          ? [{ promotion_code: redemption.stripePromotionCodeId }]
          : undefined,
        billing_address_collection: "required",
        shipping_address_collection:
          product.productType === "physical"
            ? ({ allowed_countries: shippingCountries } as never)
            : undefined,
        customer_email: args.customerEmail.trim(),
        metadata: {
          orderId: draft.orderId,
          orderNumber: draft.orderNumber,
          paymentId: draft.paymentId,
          productId: product._id,
          variantId: variant?._id ?? "",
          stashRedemptionId: redemption?._id ?? "",
          customerName: args.customerName.trim(),
        },
        payment_intent_data: {
          metadata: {
            orderId: draft.orderId,
            paymentId: draft.paymentId,
            rail: "stripe",
          },
        },
        custom_text: {
          submit: {
            message:
              product.productType === "physical"
                ? "Shipping details are collected securely during payment."
                : "Digital delivery will unlock after payment confirmation.",
          },
        },
      });

      await ctx.runMutation(internal.checkout.markStripeCheckoutSessionCreated, {
        paymentId: draft.paymentId,
        stripeCheckoutSessionId: session.id,
      });

      return {
        sessionId: session.id,
        orderId: draft.orderId,
        orderNumber: draft.orderNumber,
        checkoutUrl: session.url,
      };
    } catch (error) {
      if (draft) {
        await ctx.runMutation(internal.checkout.failStripeCheckoutPayment, {
          paymentId: draft.paymentId,
        });
      }
      throw error;
    }
  },
});

export const sessionStatus = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (_ctx, { sessionId }) => {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return {
      sessionId: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
      customerName: session.customer_details?.name ?? null,
      orderNumber: session.metadata?.orderNumber ?? null,
      orderId: session.metadata?.orderId ?? null,
    };
  },
});

export const configStatus = action({
  args: {},
  handler: async () => {
    const configuredSiteUrl =
      envValue("SITE_URL") ?? envValue("APP_URL") ?? envValue("VITE_APP_URL") ?? null;
    return {
      stripeSecretConfigured: Boolean(envValue("STRIPE_SECRET_KEY")),
      stripeWebhookSecretConfigured: Boolean(envValue("STRIPE_WEBHOOK_SECRET")),
      siteUrl: configuredSiteUrl,
      usesBrowserOriginFallback: configuredSiteUrl === null,
      convexSiteUrl: envValue("CONVEX_SITE_URL") ?? null,
      webhookPath: "/stripe/webhook",
    };
  },
});

function normalizeOrigin(origin: string | undefined) {
  if (!origin?.trim()) return appBaseUrl();
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`;
  } catch {
    return appBaseUrl();
  }
}

function toUsdCents(amount: number) {
  return Math.max(1, Math.round(amount * 100));
}
