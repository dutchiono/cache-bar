import { useQuery } from "convex/react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type OrderDetailRecord = NonNullable<ReturnType<typeof useQuery<typeof api.checkout.orderDetail>>>;
type OrderPayment = OrderDetailRecord["payments"][number];
type OrderItem = OrderDetailRecord["items"][number];
type OrderFulfillment = OrderItem["fulfillments"][number];
type OrderBurn = OrderDetailRecord["tokenBurns"][number];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const orderId = id as Id<"orders">;
  const order = useQuery(api.checkout.orderDetail, { orderId });

  if (order === undefined) return <p className="text-sm text-neutral-500">Loading...</p>;
  if (!order) return <p className="text-sm text-neutral-500">Order not found.</p>;

  return (
    <div className="space-y-5">
      <div className="text-xs text-neutral-500">
        <Link to="/app/orders" className="cb-link">
          Orders
        </Link>{" "}
        / {order.number}
      </div>

      <section className="cb-panel-dark p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="cb-kicker text-[var(--cb-gold)]">Order lifecycle</p>
            <h1 className="cb-display mt-2 text-4xl font-semibold">{order.number}</h1>
            <p className="mt-2 text-sm text-zinc-400">
              {order.customer?.name ?? "Unknown customer"} · {order.customer?.email ?? "No email"}
            </p>
          </div>
          <div className="text-right">
            <div className="cb-display text-3xl font-semibold">{money.format(order.total)}</div>
            <div className="mt-1 text-sm text-zinc-300">{order.status}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card title="Payments">
          <div className="space-y-2">
            {order.payments.map((payment: OrderPayment) => (
              <div key={payment._id} className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-medium">{payment.rail}</div>
                  <span className="cb-badge">{payment.status}</span>
                </div>
                <div className="mt-2 grid gap-2 text-xs text-[var(--cb-muted)]">
                  <div>Rail: {payment.rail}</div>
                  <div>Chain: {payment.chain ?? "—"}</div>
                  {payment.rail === "stripe" ? (
                    <>
                      <div>Order total: {money.format(order.total)}</div>
                      <div>Method: {payment.stripePaymentMethodType ?? "—"}</div>
                      <div className="truncate font-mono">Stripe session: {payment.stripeCheckoutSessionId ?? "—"}</div>
                      <div className="truncate font-mono">Payment intent: {payment.stripePaymentIntentId ?? "—"}</div>
                      <div className="truncate font-mono">Refund: {payment.stripeRefundId ?? "—"}</div>
                      <div>Refund amount: {payment.stripeRefundAmountUsd ? money.format(payment.stripeRefundAmountUsd) : "—"}</div>
                    </>
                  ) : (
                    <>
                      <div>Amount: {payment.amountUsdc?.toFixed(2) ?? "—"} USDC</div>
                      <div className="truncate font-mono">Tx: {payment.txHash ?? "—"}</div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Items & Fulfillment">
          <div className="space-y-3">
            {order.items.map((item: OrderItem) => (
              <div key={item._id} className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{item.product?.title ?? "Unknown product"}</div>
                    <div className="text-xs text-[var(--cb-muted)]">
                      {item.variant?.optionLabel ?? "Default"} · qty {item.quantity}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div>{money.format(item.unitPrice)}</div>
                    <div className="text-xs text-[var(--cb-muted)]">{item.fulfillmentKind}</div>
                  </div>
                </div>
                <div className="mt-2 space-y-1 text-xs text-[var(--cb-muted)]">
                  {item.fulfillments.map((fulfillment: OrderFulfillment) => (
                    <div key={fulfillment._id}>
                      {fulfillment.kind} · {fulfillment.status} · {fulfillment.trackingNumber ?? fulfillment.deliveredAssetUrl ?? "no reference"}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {order.shippingAddress && (
        <Card title="Shipping">
          <div className="grid gap-1 text-sm">
            <div>{order.customer?.name ?? "Customer"}</div>
            <div>{order.shippingAddress.line1}</div>
            {order.shippingAddress.line2 && <div>{order.shippingAddress.line2}</div>}
            <div>
              {order.shippingAddress.city}, {order.shippingAddress.region} {order.shippingAddress.postalCode}
            </div>
            <div>{order.shippingAddress.country}</div>
          </div>
        </Card>
      )}

      {order.stashRedemption && (
        <Card title=".stash redemption">
          <div className="grid gap-2 text-sm">
            <div>Code: <span className="font-mono text-xs">{order.stashRedemption.promotionCode ?? "—"}</span></div>
            <div>Status: {order.stashRedemption.status}</div>
            <div>Discount: {money.format(order.stashRedemption.discountValueUsd)}</div>
            <div>Email: {order.stashRedemption.customerEmail}</div>
            <div>Burn tx: <span className="font-mono text-xs">{order.stashRedemption.burnTxHash ?? "—"}</span></div>
          </div>
        </Card>
      )}

      <Card title="Token Burns">
        <div className="space-y-2">
          {order.tokenBurns.map((burn: OrderBurn) => (
            <div key={burn._id} className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{burn.amountTokens} tokens</div>
                <span className="cb-badge">{burn.status ?? "pending"}</span>
              </div>
              <div className="mt-1 text-xs text-[var(--cb-muted)]">
                Discount: {money.format(burn.discountValue)} · {burn.walletAddress ?? "no wallet"}
              </div>
            </div>
          ))}
          {order.tokenBurns.length === 0 && <Empty>No token burns recorded for this order.</Empty>}
        </div>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="cb-panel p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed border-[var(--cb-line)] p-3 text-sm text-[var(--cb-muted)]">{children}</div>;
}
