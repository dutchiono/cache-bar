import { HOUR, MINUTE, RateLimiter, SECOND } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  publicConciergeMessage: {
    kind: "token bucket",
    rate: 6,
    period: MINUTE,
    capacity: 12,
  },
  globalConciergeMessage: {
    kind: "token bucket",
    rate: 120,
    period: MINUTE,
    capacity: 240,
    shards: 8,
  },
  elizaProxyRequest: {
    kind: "token bucket",
    rate: 60,
    period: MINUTE,
    capacity: 120,
    shards: 8,
  },
  checkoutSession: {
    kind: "fixed window",
    rate: 5,
    period: MINUTE,
  },
  publicPaymentVerification: {
    kind: "fixed window",
    rate: 8,
    period: 10 * MINUTE,
  },
  stashRedemptionIntent: {
    kind: "fixed window",
    rate: 8,
    period: HOUR,
  },
  stashIssuePromotionCode: {
    kind: "fixed window",
    rate: 4,
    period: 10 * MINUTE,
  },
  stripeRefund: {
    kind: "fixed window",
    rate: 3,
    period: MINUTE,
  },
  authSensitiveMutation: {
    kind: "fixed window",
    rate: 1,
    period: SECOND,
    capacity: 3,
  },
});
