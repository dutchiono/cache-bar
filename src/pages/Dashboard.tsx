import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function Dashboard() {
  const products = useQuery(api.products.list, {});
  const creators = useQuery(api.creators.list, {});
  const inventory = useQuery(api.inventory.listOverview, {});
  const treasury = useQuery(api.treasury.overview, {});
  const reports = useQuery(api.reports.overview, {});
  const orders = useQuery(api.checkout.recentOrders, {});

  const liveProducts = reports?.metrics.liveProducts ?? 0;
  const drafts = reports?.metrics.draftProducts ?? 0;
  const activeCreators = reports?.metrics.activeCreators ?? 0;
  const reviewQueue = reports?.metrics.reviewQueue ?? 0;
  const lowStockCount = inventory?.filter((row) => row.needsReorder).length ?? 0;
  const pendingOffRamps =
    treasury?.offRampJobs.filter((job) => ["proposed", "approved", "settling"].includes(job.status)).length ?? 0;
  const pendingPayments =
    orders?.filter(
      (order) =>
        order.status === "awaiting_payment" ||
        order.payments.some((payment) => payment.status === "pending"),
    ).length ?? 0;
  const recentProducts =
    (products ?? []).slice().sort((a, b) => b._creationTime - a._creationTime).slice(0, 5);
  const recentOrders = (reports?.recentOrders ?? []).slice(0, 5);
  const treasuryAccounts = treasury?.accounts ?? [];
  const attentionItems = [
    {
      label: "Review queue",
      detail: reviewQueue === 0 ? "No submissions waiting on catalog review." : `${reviewQueue} submission${reviewQueue === 1 ? "" : "s"} need review.`,
      href: "/app/submissions",
      count: reviewQueue,
    },
    {
      label: "Low stock variants",
      detail: lowStockCount === 0 ? "All tracked inventory is above reorder point." : `${lowStockCount} variant${lowStockCount === 1 ? "" : "s"} need reorder planning.`,
      href: "/app/inventory",
      count: lowStockCount,
    },
    {
      label: "Pending crypto payments",
      detail: pendingPayments === 0 ? "No orders are waiting on payment verification." : `${pendingPayments} order${pendingPayments === 1 ? "" : "s"} need payment follow-up.`,
      href: "/app/orders",
      count: pendingPayments,
    },
    {
      label: "Treasury proposals",
      detail: pendingOffRamps === 0 ? "No off-ramp proposals are open." : `${pendingOffRamps} treasury proposal${pendingOffRamps === 1 ? "" : "s"} need action.`,
      href: "/app/treasury",
      count: pendingOffRamps,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="cb-panel-dark p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="cb-kicker text-[var(--cb-gold)]">Operations dashboard</p>
            <h1 className="cb-display mt-2 text-4xl font-semibold">Run catalog, checkout, and treasury from one place.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              This dashboard tracks the documented operating loop: review submissions, publish products,
              monitor payment state, keep inventory healthy, and move treasury proposals into finance review.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/app/submissions" className="cb-button bg-[var(--cb-paper-soft)] text-[var(--cb-ink)] hover:bg-white">
              Review queue
            </Link>
            <Link to="/app/products" className="cb-button-secondary border-[rgba(247,241,231,0.25)] bg-transparent text-[var(--cb-paper-soft)] hover:bg-[rgba(247,241,231,0.08)]">
              Products
            </Link>
            <Link to="/app/treasury" className="cb-button-secondary border-[rgba(247,241,231,0.25)] bg-transparent text-[var(--cb-paper-soft)] hover:bg-[rgba(247,241,231,0.08)]">
              Treasury
            </Link>
            <Link to="/" className="cb-button-secondary border-[rgba(247,241,231,0.25)] bg-transparent text-[var(--cb-paper-soft)] hover:bg-[rgba(247,241,231,0.08)]">
              Live storefront
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="Net sales" value={money.format(reports?.metrics.netSales ?? 0)} detail="Paid and fulfilled orders less refunds" />
        <Metric label="USDC treasury" value={money.format(treasury?.metrics.totalUsdc ?? 0)} detail="Across multisig accounts" />
        <Metric label="Live products" value={String(liveProducts)} detail={`${drafts} draft${drafts === 1 ? "" : "s"}`} />
        <Metric label="Review queue" value={String(reviewQueue)} detail="New and prescreened submissions" />
        <Metric label="Active creators" value={String(activeCreators)} detail={`${creators?.filter((creator) => creator.type === "agent").length ?? 0} agent`} />
        <Metric label="Tokens burned" value={String(reports?.metrics.tokensBurned ?? 0)} detail="Spend-to-burn lifetime total" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Needs Attention" href="/app/submissions" ctaLabel="Open queue">
          <div className="space-y-2">
            {attentionItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="flex items-start justify-between gap-4 rounded-md border border-[var(--cb-line)] bg-white/35 p-3 transition hover:bg-white/60"
              >
                <div>
                  <div className="text-sm font-semibold text-[var(--cb-ink)]">{item.label}</div>
                  <div className="mt-1 text-sm text-[var(--cb-muted)]">{item.detail}</div>
                </div>
                <span className="cb-display text-2xl font-semibold">{item.count}</span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Launch A Drop" href="/app/products" ctaLabel="Open catalog">
          <div className="grid gap-2">
            <LaunchRow
              title="Create products"
              detail="Draft physical or digital products with provenance, pricing, and accepted rails."
              href="/app/products"
            />
            <LaunchRow
              title="Set creators and splits"
              detail="Assign human or agent creators and keep royalty splits balanced before approval."
              href="/app/creators"
            />
            <LaunchRow
              title="Review submissions"
              detail="Move drafts through prescreen, approval, and live publication."
              href="/app/submissions"
            />
            <LaunchRow
              title="Preview the buyer flow"
              detail="Check the live storefront and checkout before sending traffic."
              href="/checkout"
            />
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel title="Recent Products" href="/app/products" ctaLabel="View all">
          <div className="space-y-2">
            {recentProducts.map((product) => (
              <Link
                key={product._id}
                to={`/app/products/${product._id}`}
                className="flex items-center gap-3 rounded-md border border-[var(--cb-line)] bg-white/35 p-2 transition hover:bg-white/70"
              >
                {product.demoImageUrls?.[0] ? (
                  <img
                    src={product.demoImageUrls[0]}
                    alt={product.title}
                    className="h-12 w-12 rounded border border-[var(--cb-line)] bg-[var(--cb-charcoal)] object-contain p-0.5"
                  />
                ) : (
                  <div className="h-12 w-12 rounded border border-dashed border-[var(--cb-line)]" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{product.title}</div>
                  <div className="text-xs text-[var(--cb-muted)]">
                    {product.status} · {product.basePrice} {product.currency}
                  </div>
                </div>
              </Link>
            ))}
            {recentProducts.length === 0 && <EmptyLine>No products yet.</EmptyLine>}
          </div>
        </Panel>

        <Panel title="Treasury Snapshot" href="/app/treasury" ctaLabel="Open treasury">
          <div className="space-y-2">
            {treasuryAccounts.map((account) => (
              <div key={account._id} className="rounded-md border border-[var(--cb-line)] bg-white/35 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--cb-ink)]">{account.label}</div>
                    <div className="mt-1 text-xs text-[var(--cb-muted)]">
                      {account.kind === "usdc_multisig" ? `${account.chain ?? "Chain"} treasury` : "Fiat operations account"}
                    </div>
                  </div>
                  <div className="text-right text-sm font-semibold">
                    {money.format(account.balanceCache)}
                  </div>
                </div>
              </div>
            ))}
            {treasuryAccounts.length === 0 && <EmptyLine>No treasury accounts yet.</EmptyLine>}
          </div>
        </Panel>

        <Panel title="Recent Orders" href="/app/orders" ctaLabel="View orders">
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <Link
                key={order._id}
                to={`/app/orders/${order._id}`}
                className="flex items-start justify-between gap-4 rounded-md border border-[var(--cb-line)] bg-white/35 p-3 transition hover:bg-white/60"
              >
                <div>
                  <div className="text-sm font-semibold text-[var(--cb-ink)]">{order.number}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-[var(--cb-muted)]">{order.status}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{money.format(order.total)}</div>
                  <div className="mt-1 text-xs text-[var(--cb-muted)]">
                    {new Date(order.placedAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
            {recentOrders.length === 0 && <EmptyLine>No orders yet.</EmptyLine>}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="cb-panel p-4">
      <div className="cb-kicker">{label}</div>
      <div className="cb-display mt-2 text-4xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-[var(--cb-muted)]">{detail}</div>
    </div>
  );
}

function Panel({
  title,
  href,
  ctaLabel,
  children,
}: {
  title: string;
  href: string;
  ctaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="cb-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
        <Link to={href} className="cb-link text-xs text-[var(--cb-muted)]">
          {ctaLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

function LaunchRow({ title, detail, href }: { title: string; detail: string; href: string }) {
  return (
    <Link
      to={href}
      className="rounded-md border border-[var(--cb-line)] bg-white/35 p-3 transition hover:bg-white/60"
    >
      <div className="text-sm font-semibold text-[var(--cb-ink)]">{title}</div>
      <div className="mt-1 text-sm text-[var(--cb-muted)]">{detail}</div>
    </Link>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed border-[var(--cb-line)] p-3 text-sm text-[var(--cb-muted)]">{children}</div>;
}
