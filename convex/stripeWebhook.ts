import type Stripe from "stripe";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { getStripe, stripeWebhookSecret } from "./lib/stripe";

export const handle = httpAction(async (ctx, request) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header.", { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret());
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Invalid webhook signature.", {
      status: 400,
    });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    if (!isCheckoutSession(session)) return new Response("ok");
    const paymentId = session.metadata?.paymentId as Id<"payments"> | undefined;
    if (!paymentId) return new Response("ok");
    if (session.payment_status === "paid") {
      await ctx.runMutation(internal.checkout.confirmStripeCheckoutPayment, {
        paymentId,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : undefined,
        stripePaymentMethodType: inferPaymentMethodType(session),
        shippingAddress: toShippingAddress(session),
      });
    }
    return new Response("ok");
  }

  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object;
    if (!isCheckoutSession(session)) return new Response("ok");
    const paymentId = session.metadata?.paymentId as Id<"payments"> | undefined;
    if (!paymentId) return new Response("ok");
    await ctx.runMutation(internal.checkout.failStripeCheckoutPayment, {
      paymentId,
      stripeCheckoutSessionId: session.id,
    });
    return new Response("ok");
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object;
    if (!isPaymentIntent(paymentIntent)) return new Response("ok");
    const paymentId = await resolvePaymentIdForIntent(ctx, paymentIntent.id, paymentIntent.metadata?.paymentId);
    if (!paymentId) return new Response("ok");
    await ctx.runMutation(internal.checkout.syncStripePaymentFailureFromWebhook, {
      paymentId,
      stripePaymentIntentId: paymentIntent.id,
    });
    return new Response("ok");
  }

  if (event.type === "refund.created" || event.type === "refund.updated") {
    const refund = event.data.object;
    if (!isRefund(refund) || refund.status !== "succeeded" || typeof refund.payment_intent !== "string") {
      return new Response("ok");
    }
    const paymentId = await resolvePaymentIdForIntent(ctx, refund.payment_intent, refund.metadata?.paymentId);
    if (!paymentId) return new Response("ok");
    await ctx.runMutation(internal.checkout.syncStripeRefundFromWebhook, {
      paymentId,
      stripePaymentIntentId: refund.payment_intent,
      stripeRefundId: refund.id,
      refundAmountUsd: (refund.amount ?? 0) / 100,
    });
    return new Response("ok");
  }

  return new Response("ok");
});

function isCheckoutSession(value: unknown): value is Stripe.Checkout.Session {
  return Boolean(value && typeof value === "object" && "id" in value);
}

function isPaymentIntent(value: unknown): value is Stripe.PaymentIntent {
  return Boolean(value && typeof value === "object" && "id" in value && "object" in value);
}

function isRefund(value: unknown): value is Stripe.Refund {
  return Boolean(value && typeof value === "object" && "id" in value && "status" in value);
}

function inferPaymentMethodType(session: Stripe.Checkout.Session) {
  if (session.payment_method_types?.length === 1) {
    return session.payment_method_types[0];
  }
  return undefined;
}

function toShippingAddress(session: Stripe.Checkout.Session) {
  const address = session.collected_information?.shipping_details?.address;
  if (!address?.line1 || !address.city || !address.postal_code || !address.country) {
    return undefined;
  }
  return {
    line1: address.line1,
    line2: address.line2 ?? undefined,
    city: address.city,
    region: address.state ?? address.city,
    postalCode: address.postal_code,
    country: address.country,
  };
}

async function resolvePaymentIdForIntent(
  ctx: {
    runQuery: (
      query: typeof internal.checkout.stripePaymentByIntent,
      args: { stripePaymentIntentId: string },
    ) => Promise<{ _id: Id<"payments"> } | null>;
  },
  stripePaymentIntentId: string,
  paymentIdFromMetadata: string | undefined,
) {
  if (paymentIdFromMetadata) {
    return paymentIdFromMetadata as Id<"payments">;
  }
  const payment = await ctx.runQuery(internal.checkout.stripePaymentByIntent, {
    stripePaymentIntentId,
  });
  return payment?._id;
}
