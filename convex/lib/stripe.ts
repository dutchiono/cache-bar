import Stripe from "stripe";

let cachedStripe: Stripe | null = null;

export function getStripe() {
  const secretKey = envValue("STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }
  if (!cachedStripe) {
    cachedStripe = new Stripe(secretKey);
  }
  return cachedStripe;
}

export function stripeWebhookSecret() {
  const secret = envValue("STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    throw new Error("Missing STRIPE_WEBHOOK_SECRET.");
  }
  return secret;
}

export function appBaseUrl() {
  return (
    envValue("SITE_URL") ??
    envValue("APP_URL") ??
    envValue("VITE_APP_URL") ??
    "http://127.0.0.1:4173"
  );
}

export function envValue(key: string) {
  const globalProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return globalProcess.process?.env?.[key];
}

export function promotionCodeSlug(prefix: string | undefined, id: string) {
  const safePrefix = (prefix ?? "STASH").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10) || "STASH";
  return `${safePrefix}${id.replace(/[^A-Za-z0-9]/g, "").slice(-8).toUpperCase()}`;
}
