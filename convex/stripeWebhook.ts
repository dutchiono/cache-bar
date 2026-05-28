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

  const session = event.data.object;
  if (!isCheckoutSession(session)) {
    return new Response("ok");
  }

  const paymentId = session.metadata?.paymentId as Id<"payments"> | undefined;
  if (!paymentId) {
    return new Response("ok");
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
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
  }

  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    await ctx.runMutation(internal.checkout.failStripeCheckoutPayment, {
      paymentId,
      stripeCheckoutSessionId: session.id,
    });
  }

  return new Response("ok");
});

function isCheckoutSession(value: unknown): value is Stripe.Checkout.Session {
  return Boolean(value && typeof value === "object" && "id" in value);
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
