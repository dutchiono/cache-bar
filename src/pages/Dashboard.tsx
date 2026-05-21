import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";

export default function Dashboard() {
  const products = useQuery(api.products.list, {});
  const creators = useQuery(api.creators.list, {});
  const submissions = useQuery(api.submissions.list, {});

  const liveProducts = products?.filter((p) => p.status === "live").length ?? 0;
  const drafts = products?.filter((p) => p.status === "draft").length ?? 0;
  const agentCreators = creators?.filter((c) => c.type === "agent").length ?? 0;
  const reviewQueue =
    submissions?.filter((s) => s.status === "new" || s.status === "prescreened").length ?? 0;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="cb-panel-dark overflow-hidden">
          <div className="grid min-h-[320px] gap-4 p-5 md:grid-cols-[1fr_320px]">
            <div className="flex flex-col justify-between">
              <div>
                <p className="cb-kicker text-[var(--cb-gold)]">Commerce command room</p>
                <h1 className="cb-display mt-3 max-w-2xl text-5xl font-semibold leading-tight">
                  .cache is the house system for drops, royalties, and creator-led merch.
                </h1>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link to="/products" className="cb-button bg-[var(--cb-paper-soft)] text-[var(--cb-ink)] hover:bg-white">
                  Catalog
                </Link>
                <Link to="/submissions" className="cb-button-secondary border-[rgba(247,241,231,0.25)] bg-transparent text-[var(--cb-paper-soft)] hover:bg-[rgba(247,241,231,0.08)]">
                  Review queue
                </Link>
              </div>
            </div>
            <div className="grid gap-3">
              <img
                src="/images/waifu.png"
                alt="WAIFU.FUN product board"
                className="h-44 w-full rounded-md border border-white/15 bg-black object-contain p-2"
              />
              <img
                src="/images/image.png"
                alt="Capsule reference board"
                className="h-32 w-full rounded-md border border-white/15 bg-black object-contain p-2"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Metric label="Live products" value={liveProducts} detail={`${drafts} drafts`} />
          <Metric label="Review queue" value={reviewQueue} detail="Needs catalog action" />
          <Metric label="Creators" value={creators?.length ?? 0} detail={`${agentCreators} agent-led`} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Latest Products" href="/products">
          <div className="space-y-2">
            {(products ?? []).slice(0, 5).map((product) => (
              <Link
                key={product._id}
                to={`/products/${product._id}`}
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
            {products?.length === 0 && <EmptyLine>No products yet.</EmptyLine>}
          </div>
        </Panel>

        <Panel title="Submission Flow" href="/submissions">
          <div className="space-y-3">
            {["Draft", "Submit", "Prescreen", "Approve", "Live"].map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-[var(--cb-line)] bg-white/40 text-xs font-semibold">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">{step}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Next Wiring" href="/agent">
          <div className="space-y-3 text-sm text-[var(--cb-muted)]">
            <div className="rounded-md border border-[var(--cb-line)] bg-white/35 p-3">
              <div className="font-semibold text-[var(--cb-ink)]">Treasury</div>
              <div>Wire balances, off-ramp proposals, supplier payments.</div>
            </div>
            <div className="rounded-md border border-[var(--cb-line)] bg-white/35 p-3">
              <div className="font-semibold text-[var(--cb-ink)]">Eliza</div>
              <div>Attach agent actions to product prescreen and creator ops.</div>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="cb-panel p-4">
      <div className="cb-kicker">{label}</div>
      <div className="cb-display mt-2 text-4xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-[var(--cb-muted)]">{detail}</div>
    </div>
  );
}

function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="cb-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
        <Link to={href} className="cb-link text-xs text-[var(--cb-muted)]">
          Open
        </Link>
      </div>
      {children}
    </section>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed border-[var(--cb-line)] p-3 text-sm text-[var(--cb-muted)]">{children}</div>;
}
