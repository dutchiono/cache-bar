import { useAction } from "convex/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";

type TeemillStatus = {
  configured: boolean;
  customProductConfigured: boolean;
  projectName: string | null;
  privateApiKeyConfigured: boolean;
  publicSafeKeyConfigured: boolean;
};

type TeemillCatalogSmoke = {
  ok: boolean;
  productCount: number;
  projectName: string | null;
  sample: Array<{
    id: string;
    title: string;
    slug: string | null;
    variantCount: number;
  }>;
};

const stickerRun = [
  {
    sku: "CST-001",
    name: "Cache Mark",
    type: "Die-cut vinyl",
    quantity: 50,
  },
  {
    sku: "CST-002",
    name: "Proof Label",
    type: "Matte proof label",
    quantity: 50,
  },
  {
    sku: "CST-003",
    name: "Seal Holo",
    type: "Holographic seal",
    quantity: 50,
  },
];

export default function Checkout() {
  const getTeemillStatus = useAction(api.teemill.configStatus);
  const getTeemillCatalogSmoke = useAction(api.teemill.catalogSmoke);
  const [teemill, setTeemill] = useState<TeemillStatus | null>(null);
  const [teemillCatalog, setTeemillCatalog] = useState<TeemillCatalogSmoke | null>(null);
  const [teemillError, setTeemillError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getTeemillStatus({}), getTeemillCatalogSmoke({})])
      .then(([status, catalog]) => {
        if (!active) return;
        setTeemill(status);
        setTeemillCatalog(catalog);
      })
      .catch((error) => {
        if (active) {
          setTeemillError(error instanceof Error ? error.message : "Unable to load POD provider status.");
        }
      });
    return () => {
      active = false;
    };
  }, [getTeemillCatalogSmoke, getTeemillStatus]);

  return (
    <div className="space-y-5">
      <section className="cb-panel-dark p-5">
        <p className="cb-kicker text-[var(--cb-gold)]">POD launchpad</p>
        <h1 className="cb-display mt-2 text-4xl font-semibold">Sticker run setup</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          The active storefront is a sticker POD reservation flow: three sticker types, fifty each,
          price TBD until the provider proof and production quote are approved.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Sticker SKUs</h2>
            <div className="grid gap-3 md:grid-cols-3">
              {stickerRun.map((sticker) => (
                <div key={sticker.sku} className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
                  <div className="cb-label">{sticker.sku}</div>
                  <div className="mt-2 font-semibold">{sticker.name}</div>
                  <div className="mt-1 text-sm text-[var(--cb-muted)]">{sticker.type}</div>
                  <div className="mt-3 text-sm font-medium">{sticker.quantity} units · price TBD</div>
                </div>
              ))}
            </div>
          </section>

          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">POD Provider</h2>
            {teemillError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {teemillError}
              </p>
            )}
            {!teemill && !teemillError && (
              <p className="text-sm text-[var(--cb-muted)]">Loading POD provider status...</p>
            )}
            {teemill && (
              <div className="grid gap-3 md:grid-cols-2">
                <StatusCard
                  label="Catalog / orders"
                  ok={teemill.configured}
                  good="Provider project + private key configured"
                  bad="Missing provider project or private key"
                />
                <StatusCard
                  label="Custom product"
                  ok={teemill.customProductConfigured}
                  good="Custom-product key configured"
                  bad="Missing custom-product public key"
                />
                <InfoCard label="Provider project" value={teemill.projectName ?? "Not configured"} mono />
                <InfoCard
                  label="Catalog products"
                  value={teemillCatalog ? String(teemillCatalog.productCount) : "Loading..."}
                />
              </div>
            )}
            {teemillCatalog && teemillCatalog.productCount === 0 && (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Provider credentials are reachable, but the catalog has no products yet. Create or map
                the three sticker SKUs before turning on paid checkout.
              </p>
            )}
          </section>

          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Buyer Flow</h2>
            <div className="space-y-2 text-sm text-[var(--cb-muted)]">
              <p>1. Buyer reserves one of the three sticker types from the public storefront.</p>
              <p>2. Checkout collects contact and fulfillment details only.</p>
              <p>3. The final step submits a POD proof request, with no card or payment collection.</p>
              <p>4. Ops locks price after artwork proof, provider quote, tax, and shipping are known.</p>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">POD Checklist</h2>
            <div className="space-y-2 text-sm text-[var(--cb-muted)]">
              <p>Export production artwork for `CST-001`, `CST-002`, and `CST-003`.</p>
              <p>Confirm sticker material, cut line, bleed, finish, and backing requirements.</p>
              <p>Create or map each SKU in the POD provider catalog at quantity 50.</p>
              <p>Approve physical or digital proofs before production.</p>
              <p>Set final unit price only after the provider quote and shipping rate are locked.</p>
            </div>
          </section>

          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Preview</h2>
            <p className="mb-4 text-sm text-[var(--cb-muted)]">
              The live storefront route now renders the static `.cache` sticker bundle and the public
              checkout is a POD request flow.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/" className="cb-button">Open storefront</Link>
              <Link to="/checkout" className="cb-button-secondary">Open POD request</Link>
            </div>
          </section>

          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Pricing Gate</h2>
            <div className="space-y-2 text-sm text-[var(--cb-muted)]">
              <p>The current storefront intentionally shows `TBD` instead of `$0`.</p>
              <p>Do not enable paid checkout until the proof, quote, margin, and shipping rules are final.</p>
              <p>When price is decided, update the three sticker SKUs in `public/data.js` and the Convex product seed.</p>
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
