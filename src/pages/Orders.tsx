import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

type Order = NonNullable<ReturnType<typeof useQuery<typeof api.checkout.recentOrders>>>[number];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function Orders() {
  const orders = useQuery(api.checkout.recentOrders, {});
  const markPayment = useMutation(api.checkout.markPayment);
  const cancelOrder = useMutation(api.checkout.cancelOrder);
  const refundOrder = useMutation(api.checkout.refundOrder);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function mark(paymentId: Id<"payments">, status: "confirmed" | "failed") {
    setBusy(paymentId);
    setError(null);
    try {
      await markPayment({
        paymentId,
        status,
        txHash: status === "confirmed" ? `manual-${paymentId}` : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update payment.");
    } finally {
      setBusy(null);
    }
  }

  async function cancel(orderId: Id<"orders">) {
    setBusy(orderId);
    setError(null);
    try {
      await cancelOrder({ orderId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel order.");
    } finally {
      setBusy(null);
    }
  }

  async function refund(orderId: Id<"orders">) {
    setBusy(orderId);
    setError(null);
    try {
      await refundOrder({
        orderId,
        txHashOrRef: `manual-refund-${orderId}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refund order.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="cb-panel-dark p-5">
        <p className="cb-kicker text-[var(--cb-gold)]">Payment operations</p>
        <h1 className="cb-display mt-2 text-4xl font-semibold">Orders</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Crypto checkout orders, USDC records, and x402 payment requirements.
        </p>
      </section>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="space-y-3">
        {(orders ?? []).map((order) => (
          <OrderCard
            key={order._id}
            order={order}
            busy={busy}
            onMark={mark}
            onCancel={cancel}
            onRefund={refund}
          />
        ))}
        {orders?.length === 0 && (
          <div className="cb-panel border-dashed p-4 text-sm text-[var(--cb-muted)]">
            No orders yet. Create one from Checkout.
          </div>
        )}
      </section>
    </div>
  );
}

function OrderCard({
  order,
  busy,
  onMark,
  onCancel,
  onRefund,
}: {
  order: Order;
  busy: string | null;
  onMark: (paymentId: Id<"payments">, status: "confirmed" | "failed") => void;
  onCancel: (orderId: Id<"orders">) => void;
  onRefund: (orderId: Id<"orders">) => void;
}) {
  const payment = order.payments[0];
  return (
    <article className="cb-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{order.number}</h2>
            <StatusBadge status={order.status} />
            {payment && <StatusBadge status={payment.rail} />}
          </div>
          <div className="mt-1 text-sm text-[var(--cb-muted)]">
            {order.customer?.name ?? "Unknown customer"} · {order.customer?.email ?? "no email"}
          </div>
        </div>
        <div className="text-right">
          <div className="cb-display text-2xl font-semibold">{money.format(order.total)}</div>
          <div className="text-xs text-[var(--cb-muted)]">
            {new Date(order.placedAt).toLocaleString()}
          </div>
        </div>
      </div>

      {payment && (
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
            <div className="mb-2 text-sm font-semibold">Payment</div>
            <Line label="Status" value={payment.status} />
            <Line label="Chain" value={payment.chain ?? "—"} />
            <Line label="Amount USDC" value={payment.amountUsdc?.toFixed(2) ?? "—"} />
            <Line label="Tx" value={payment.txHash ?? "—"} mono />
          </div>
          {payment.x402 && (
            <div className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
              <div className="mb-2 text-sm font-semibold">x402</div>
              <Line label="Network" value={payment.x402.network} mono />
              <Line label="Asset" value={payment.x402.asset} mono />
              <Line label="Pay to" value={payment.x402.payTo} mono />
              <Line label="Price" value={payment.x402.price} />
            </div>
          )}
        </div>
      )}

      {payment && payment.status === "pending" && (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onCancel(order._id)}
            className="cb-button-secondary min-h-8 px-3 py-1 text-xs"
          >
            {busy === order._id ? "Cancelling..." : "Cancel order"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onMark(payment._id, "failed")}
            className="cb-button-secondary min-h-8 px-3 py-1 text-xs"
          >
            Fail
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onMark(payment._id, "confirmed")}
            className="cb-button min-h-8 px-3 py-1 text-xs"
          >
            {busy === payment._id ? "Confirming..." : "Mark confirmed"}
          </button>
        </div>
      )}

      {payment && payment.status === "confirmed" && order.status !== "refunded" && (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onRefund(order._id)}
            className="cb-button-secondary min-h-8 px-3 py-1 text-xs"
          >
            {busy === order._id ? "Refunding..." : "Refund order"}
          </button>
        </div>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className="cb-badge">{status.replaceAll("_", " ")}</span>;
}

function Line({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[92px_1fr] gap-2 border-t border-[var(--cb-line)] py-1 text-xs">
      <span className="text-[var(--cb-muted)]">{label}</span>
      <span className={`truncate ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
