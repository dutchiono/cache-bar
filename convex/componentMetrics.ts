import { DirectAggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type StatusMetric = {
  Key: string;
  Id: string;
  Namespace: string;
};

export const orderMetrics = new DirectAggregate<StatusMetric>(components.orderMetrics);
export const paymentMetrics = new DirectAggregate<StatusMetric>(components.paymentMetrics);
export const redemptionMetrics = new DirectAggregate<StatusMetric>(components.redemptionMetrics);
export const conciergeMetrics = new DirectAggregate<StatusMetric>(components.conciergeMetrics);

export async function recordOrderMetric(ctx: MutationCtx, order: Pick<Doc<"orders">, "_id" | "status" | "total">) {
  await orderMetrics.insertIfDoesNotExist(ctx, {
    namespace: "status",
    key: order.status,
    id: order._id,
    sumValue: order.total,
  });
}

export async function replaceOrderMetric(
  ctx: MutationCtx,
  oldOrder: Pick<Doc<"orders">, "_id" | "status" | "total">,
  newOrder: Pick<Doc<"orders">, "_id" | "status" | "total">,
) {
  await orderMetrics.replaceOrInsert(
    ctx,
    {
      namespace: "status",
      key: oldOrder.status,
      id: oldOrder._id,
    },
    {
      namespace: "status",
      key: newOrder.status,
      sumValue: newOrder.total,
    },
  );
}

export async function recordPaymentMetric(
  ctx: MutationCtx,
  payment: Pick<Doc<"payments">, "_id" | "status" | "amountUsdc">,
) {
  await paymentMetrics.insertIfDoesNotExist(ctx, {
    namespace: "status",
    key: payment.status,
    id: payment._id,
    sumValue: payment.amountUsdc ?? 0,
  });
}

export async function replacePaymentMetric(
  ctx: MutationCtx,
  oldPayment: Pick<Doc<"payments">, "_id" | "status" | "amountUsdc">,
  newPayment: Pick<Doc<"payments">, "_id" | "status" | "amountUsdc">,
) {
  await paymentMetrics.replaceOrInsert(
    ctx,
    {
      namespace: "status",
      key: oldPayment.status,
      id: oldPayment._id,
    },
    {
      namespace: "status",
      key: newPayment.status,
      sumValue: newPayment.amountUsdc ?? oldPayment.amountUsdc ?? 0,
    },
  );
}

export async function recordRedemptionMetric(
  ctx: MutationCtx,
  redemption: Pick<Doc<"stashRedemptions">, "_id" | "status" | "discountValueUsd">,
) {
  await redemptionMetrics.insertIfDoesNotExist(ctx, {
    namespace: "status",
    key: redemption.status,
    id: redemption._id,
    sumValue: redemption.discountValueUsd,
  });
}

export async function replaceRedemptionMetric(
  ctx: MutationCtx,
  oldRedemption: Pick<Doc<"stashRedemptions">, "_id" | "status" | "discountValueUsd">,
  newRedemption: Pick<Doc<"stashRedemptions">, "_id" | "status" | "discountValueUsd">,
) {
  await redemptionMetrics.replaceOrInsert(
    ctx,
    {
      namespace: "status",
      key: oldRedemption.status,
      id: oldRedemption._id,
    },
    {
      namespace: "status",
      key: newRedemption.status,
      sumValue: newRedemption.discountValueUsd,
    },
  );
}

export async function recordConciergeMessageMetric(
  ctx: MutationCtx,
  message: Pick<Doc<"conciergeMessages">, "_id" | "role">,
) {
  await conciergeMetrics.insertIfDoesNotExist(ctx, {
    namespace: "role",
    key: message.role,
    id: message._id,
    sumValue: 1,
  });
}

export async function statusSummary(ctx: QueryCtx) {
  const [orders, payments, redemptions, conciergeMessages] = await Promise.all([
    countsFor(ctx, orderMetrics, "status", [
      "awaiting_payment",
      "paid",
      "processing",
      "partially_fulfilled",
      "fulfilled",
      "refunded",
      "cancelled",
    ]),
    countsFor(ctx, paymentMetrics, "status", ["pending", "confirmed", "failed", "refunded"]),
    countsFor(ctx, redemptionMetrics, "status", [
      "awaiting_burn",
      "verified",
      "issued",
      "redeemed",
      "failed",
    ]),
    countsFor(ctx, conciergeMetrics, "role", ["user", "assistant", "tool"]),
  ]);
  return { orders, payments, redemptions, conciergeMessages };
}

async function countsFor(
  ctx: QueryCtx,
  aggregate: DirectAggregate<StatusMetric>,
  namespace: string,
  keys: string[],
) {
  return Object.fromEntries(
    await Promise.all(
      keys.map(async (key) => [
        key,
        {
          count: await aggregate.count(ctx, { namespace, bounds: { eq: key } }),
          sum: await aggregate.sum(ctx, { namespace, bounds: { eq: key } }),
        },
      ]),
    ),
  );
}
