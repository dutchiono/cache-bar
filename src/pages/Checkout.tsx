import { useAction, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type ConfigStatus = {
  stripeSecretConfigured: boolean;
  stripeWebhookSecretConfigured: boolean;
  siteUrl: string | null;
  usesBrowserOriginFallback: boolean;
  convexSiteUrl: string | null;
  webhookPath: string;
};

export default function Checkout() {
  const products = useQuery(api.checkout.publicStorefrontProducts, {});
  const getConfigStatus = useAction(api.stripeCheckout.configStatus);
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getConfigStatus({})
      .then((result) => {
        if (active) setConfig(result);
      })
      .catch((error) => {
        if (active) {
          setConfigError(error instanceof Error ? error.message : "Unable to load Stripe status.");
        }
      });
    return () => {
      active = false;
    };
  }, [getConfigStatus]);

  const featuredProduct = useMemo(() => products?.[0] ?? null, [products]);
  const previewHref = featuredProduct
    ? `/checkout?product=${featuredProduct._id}${featuredProduct.variants[0]?._id ? `&variant=${featuredProduct.variants[0]._id}` : ""}&quantity=1`
    : "/checkout";

  return (
    <div className="space-y-5">
      <section className="cb-panel-dark p-5">
        <p className="cb-kicker text-[var(--cb-gold)]">Checkout launchpad</p>
        <h1 className="cb-display mt-2 text-4xl font-semibold">Stripe + .stash</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          This is the handoff surface for the live storefront checkout. Buyers use the public
          `/checkout` and `/stash` routes. Ops uses this page to verify config, preview the buyer
          path, and check the webhook target before Stripe testing.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Readiness</h2>
            {configError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {configError}
              </p>
            )}
            {!config && !configError && (
              <p className="text-sm text-[var(--cb-muted)]">Loading Stripe config…</p>
            )}
            {config && (
              <div className="grid gap-3 md:grid-cols-2">
                <StatusCard
                  label="Stripe secret"
                  ok={config.stripeSecretConfigured}
                  good="Configured in Convex"
                  bad="Missing STRIPE_SECRET_KEY"
                />
                <StatusCard
                  label="Webhook secret"
                  ok={config.stripeWebhookSecretConfigured}
                  good="Configured in Convex"
                  bad="Missing STRIPE_WEBHOOK_SECRET"
                />
                <InfoCard
                  label="Public site"
                  value={config.siteUrl ?? "Inferred from buyer browser origin"}
                  mono
                />
                <InfoCard
                  label="Stripe webhook endpoint"
                  value={`${config.convexSiteUrl ?? "Set CONVEX_SITE_URL"}/stripe/webhook`}
                  mono
                />
              </div>
            )}
            {config?.usesBrowserOriginFallback && (
              <p className="mt-3 text-xs text-[var(--cb-muted)]">
                No explicit `SITE_URL` or `APP_URL` is set in Convex. Buyer checkout still works because
                the storefront sends its current origin when creating the Stripe session.
              </p>
            )}
          </section>

          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Buyer Flow</h2>
            <div className="space-y-2 text-sm text-[var(--cb-muted)]">
              <p>1. Buyer selects a live product on the storefront.</p>
              <p>2. If the drop is token-linked, buyer redeems in `.stash` and receives a one-time Stripe code.</p>
              <p>3. Buyer enters name and email on `/checkout` and is redirected into hosted Stripe Checkout.</p>
              <p>4. Stripe posts `checkout.session.completed` to Convex and the order moves to paid automatically.</p>
            </div>
          </section>

          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Constraints</h2>
            <div className="space-y-2 text-sm text-[var(--cb-muted)]">
              <p>Self-serve `.stash` verification is currently for EVM ERC-20 transfer-to-burn programs.</p>
              <p>Physical shipping details are collected inside Stripe Checkout, not on the storefront form.</p>
              <p>Refunds still need to be initiated in Stripe first, then recorded in ops.</p>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Preview</h2>
            {featuredProduct ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  {featuredProduct.demoImageUrls?.[0] && (
                    <img
                      src={featuredProduct.demoImageUrls[0]}
                      alt={featuredProduct.title}
                      className="h-24 w-24 rounded-md border border-[var(--cb-line)] bg-[var(--cb-charcoal)] object-cover"
                    />
                  )}
                  <div>
                    <div className="font-semibold">{featuredProduct.title}</div>
                    <div className="text-sm text-[var(--cb-muted)]">
                      {money.format(featuredProduct.basePrice)}
                      {featuredProduct.tokenProgram ? ` · ${featuredProduct.tokenProgram.tokenSymbol} in .stash` : ""}
                    </div>
                    <div className="mt-2 text-sm text-[var(--cb-muted)]">
                      {featuredProduct.description}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/" className="cb-button">Open storefront</Link>
                  <Link to={previewHref} className="cb-button-secondary">Open checkout</Link>
                  {featuredProduct.tokenProgram && (
                    <Link to={`/stash?product=${featuredProduct._id}`} className="cb-button-secondary">
                      Open .stash
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--cb-muted)]">
                No live products found yet. Publish at least one product to preview the public flow.
              </p>
            )}
          </section>

          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Launch Checklist</h2>
            <div className="space-y-2 text-sm text-[var(--cb-muted)]">
              <p>Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Convex.</p>
              <p>Register the Convex HTTP webhook route in Stripe at `/stripe/webhook`.</p>
              <p>Confirm at least one live product is linked to a `.stash` program if token discounts are required.</p>
              <p>Run one real Stripe Checkout payment and one refund recording pass in ops.</p>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function StatusCard({
  label,
  ok,
  good,
  bad,
}: {
  label: string;
  ok: boolean;
  good: string;
  bad: string;
}) {
  return (
    <div className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
      <div className="cb-label">{label}</div>
      <div className={`mt-2 text-sm font-medium ${ok ? "text-emerald-700" : "text-red-700"}`}>
        {ok ? good : bad}
      </div>
    </div>
  );
}

function InfoCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
      <div className="cb-label">{label}</div>
      <div className={`mt-2 text-sm ${mono ? "font-mono text-xs" : ""}`}>{value}</div>
    </div>
  );
}
