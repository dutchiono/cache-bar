import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function Reports() {
  const overview = useQuery(api.reports.overview, {});

  return (
    <div className="space-y-5">
      <section className="cb-panel-dark p-5">
        <p className="cb-kicker text-[var(--cb-gold)]">Operations reporting</p>
        <h1 className="cb-display mt-2 text-4xl font-semibold">Reports</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Revenue, order state, treasury movement, and customer concentration from live Convex records.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Net sales" value={money.format(overview?.metrics.netSales ?? 0)} />
        <Metric label="Treasury in" value={money.format(overview?.metrics.treasuryIn ?? 0)} />
        <Metric label="Treasury out" value={money.format(overview?.metrics.treasuryOut ?? 0)} />
        <Metric label="Token discounts" value={money.format(overview?.metrics.totalTokenDiscounts ?? 0)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <Card title="KPI Snapshot">
          <div className="grid gap-2 text-sm">
            <Line label="Live products" value={String(overview?.metrics.liveProducts ?? 0)} />
            <Line label="Draft products" value={String(overview?.metrics.draftProducts ?? 0)} />
            <Line label="Active creators" value={String(overview?.metrics.activeCreators ?? 0)} />
            <Line label="Review queue" value={String(overview?.metrics.reviewQueue ?? 0)} />
            <Line label="Customers" value={String(overview?.metrics.customers ?? 0)} />
            <Line label="Refunded sales" value={money.format(overview?.metrics.refundedSales ?? 0)} />
            <Line label="Tokens burned" value={String(overview?.metrics.tokensBurned ?? 0)} />
            <Line label="Pending creator payouts" value={money.format(overview?.metrics.creatorPayoutsPending ?? 0)} />
          </div>
        </Card>

        <Card title="Sales by Status">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-[var(--cb-muted)]">
                <tr>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Orders</th>
                  <th className="py-2 pr-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(overview?.salesByStatus ?? {}).map(([status, row]) => (
                  <tr key={status} className="border-t border-[var(--cb-line)]">
                    <td className="py-2 pr-3">{status}</td>
                    <td className="py-2 pr-3">{row.count}</td>
                    <td className="py-2 pr-3">{money.format(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card title="Top Customers">
          <div className="space-y-2">
            {(overview?.topCustomers ?? []).map((customer) => (
              <div key={customer._id} className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-xs text-[var(--cb-muted)]">{customer.email ?? "No email"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{money.format(customer.lifetimeValue)}</div>
                    <div className="text-xs text-[var(--cb-muted)]">{customer.orderCount} orders</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Recent Orders">
          <div className="space-y-2">
            {(overview?.recentOrders ?? []).map((order) => (
              <div key={order._id} className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{order.number}</div>
                    <div className="text-xs text-[var(--cb-muted)]">{order.status}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{money.format(order.total)}</div>
                    <div className="text-xs text-[var(--cb-muted)]">{new Date(order.placedAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="cb-panel p-4">
      <div className="cb-kicker">{label}</div>
      <div className="cb-display mt-2 text-3xl font-semibold">{value}</div>
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

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-3 border-t border-[var(--cb-line)] py-2 first:border-0 first:pt-0">
      <span className="text-[var(--cb-muted)]">{label}</span>
      <span>{value}</span>
    </div>
  );
}
