import { useAction } from "convex/react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";

type ProdigiStatus = {
  configured: boolean;
  sandbox: boolean;
  baseUrl: string;
  apiKeyConfigured: boolean;
  mappedStickerCount: number;
  stickerSkus: Array<{
    cacheSku: string;
    name: string;
    prodigiSku?: string;
  }>;
};

type ProdigiStickerSmoke = {
  ok: boolean;
  configured: boolean;
  mappedCount: number;
  reachableCount: number;
  stickers: Array<{
    cacheSku: string;
    name: string;
    prodigiSku?: string;
    reachable: boolean;
    error?: string;
  }>;
};

type TeemillStatus = {
  configured: boolean;
  customProductConfigured: boolean;
  projectName: string | null;
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
  const getProdigiStatus = useAction(api.prodigi.configStatus);
  const getProdigiStickerSmoke = useAction(api.prodigi.stickerCatalogSmoke);
  const getTeemillStatus = useAction(api.teemill.configStatus);
  const [prodigi, setProdigi] = useState<ProdigiStatus | null>(null);
  const [prodigiStickers, setProdigiStickers] = useState<ProdigiStickerSmoke | null>(null);
  const [prodigiError, setProdigiError] = useState<string | null>(null);
  const [teemill, setTeemill] = useState<TeemillStatus | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getProdigiStatus({}), getProdigiStickerSmoke({}), getTeemillStatus({})])
      .then(([status, stickers, teemillStatus]) => {
        if (!active) return;
        setProdigi(status);
        setProdigiStickers(stickers);
        setTeemill(teemillStatus);
      })
      .catch((error) => {
        if (active) {
          setProdigiError(error instanceof Error ? error.message : "Unable to load Prodigi status.");
        }
      });
    return () => {
      active = false;
    };
  }, [getProdigiStatus, getProdigiStickerSmoke, getTeemillStatus]);

  return (
    <div className="space-y-5">
      <section className="cb-panel-dark p-5">
        <p className="cb-kicker text-[var(--cb-gold)]">Prodigi setup</p>
        <h1 className="cb-display mt-2 text-4xl font-semibold">Sticker POD launchpad</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          The active storefront is a sticker POD reservation flow backed by Prodigi: three sticker types,
          fifty each, price TBD until the provider proof and production quote are approved.
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
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Prodigi</h2>
            {prodigiError && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {prodigiError}
              </p>
            )}
            {!prodigi && !prodigiError && (
              <p className="text-sm text-[var(--cb-muted)]">Loading Prodigi status...</p>
            )}
            {prodigi && (
              <div className="grid gap-3 md:grid-cols-2">
                <StatusCard
                  label="API key"
                  ok={prodigi.configured}
                  good="Prodigi API key configured"
                  bad="Missing PRODIGI_API_KEY"
                />
                <StatusCard
                  label="Environment"
                  ok={prodigi.sandbox || prodigi.configured}
                  good={prodigi.sandbox ? "Sandbox endpoint" : "Live endpoint"}
                  bad="Base URL not configured"
                />
                <InfoCard label="Base URL" value={prodigi.baseUrl} mono />
                <InfoCard
                  label="Mapped sticker SKUs"
                  value={`${prodigi.mappedStickerCount} / ${prodigi.stickerSkus.length}`}
                />
              </div>
            )}
            {prodigiStickers && prodigiStickers.mappedCount === 0 && (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Prodigi credentials can load, but the three cache sticker SKUs are not mapped yet. Set
                `PRODIGI_STICKER_SKUS` once the Prodigi catalog SKUs are known.
              </p>
            )}
            {prodigiStickers && prodigiStickers.mappedCount > 0 && prodigiStickers.reachableCount === 0 && (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Sticker SKUs are mapped, but Prodigi product lookup has not succeeded yet. Confirm the
                mapped SKUs exist in the configured Prodigi account.
              </p>
            )}
            {prodigiStickers && prodigiStickers.reachableCount > 0 && (
              <div className="mt-3 space-y-2">
                {prodigiStickers.stickers.map((sticker) => (
                  <div
                    key={sticker.cacheSku}
                    className="rounded-md border border-[var(--cb-line)] bg-white/40 px-3 py-2 text-xs"
                  >
                    <div className="font-medium">
                      {sticker.cacheSku} · {sticker.name}
                    </div>
                    <div className={sticker.reachable ? "text-emerald-700" : "text-amber-800"}>
                      {sticker.reachable
                        ? `Prodigi SKU ${sticker.prodigiSku} reachable`
                        : sticker.error ?? "Not reachable yet"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Legacy Teemill</h2>
            {!teemill && <p className="text-sm text-[var(--cb-muted)]">Loading Teemill status...</p>}
            {teemill && (
              <div className="grid gap-3 md:grid-cols-2">
                <StatusCard
                  label="Catalog / orders"
                  ok={teemill.configured}
                  good="Teemill project + private key configured"
                  bad="Teemill catalog mode not configured"
                />
                <StatusCard
                  label="Custom product"
                  ok={teemill.customProductConfigured}
                  good="Custom-product key configured"
                  bad="Missing Teemill custom-product key"
                />
              </div>
            )}
            <p className="mt-3 text-xs text-[var(--cb-muted)]">
              Teemill remains available for one-off shirt flows. The active sticker run uses Prodigi.
            </p>
          </section>

          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Buyer Flow</h2>
            <div className="space-y-2 text-sm text-[var(--cb-muted)]">
              <p>1. Buyer reserves one of the three sticker types from the public storefront.</p>
              <p>2. Checkout collects contact and fulfillment details only.</p>
              <p>3. The final step submits a POD proof request, with no card or payment collection.</p>
              <p>4. Ops locks price after artwork proof, Prodigi quote, tax, and shipping are known.</p>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">POD Checklist</h2>
            <div className="space-y-2 text-sm text-[var(--cb-muted)]">
              <p>Export production artwork for `CST-001`, `CST-002`, and `CST-003`.</p>
              <p>Confirm sticker material, cut line, bleed, finish, and backing requirements.</p>
              <p>Map each cache SKU to a Prodigi catalog SKU at quantity 50.</p>
              <p>Quote and approve proofs through Prodigi before production.</p>
              <p>Set final unit price only after the Prodigi quote and shipping rate are locked.</p>
            </div>
          </section>

          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Agent Tool</h2>
            <div className="space-y-2 text-sm text-[var(--cb-muted)]">
              <p>The vendored Prodigi CLI lives at `tools/prodigi-agent-tool/`.</p>
              <p>Build it with Go, then use `prodigi-pp-cli tool schema` or the MCP server for agent ops.</p>
              <p>Convex actions expose the same quote and order surface for staff ops and automation.</p>
            </div>
          </section>

          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Preview</h2>
            <p className="mb-4 text-sm text-[var(--cb-muted)]">
              The live storefront route renders the static `.cache` sticker bundle and the public checkout
              is a POD request flow.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/cache.html" className="cb-button">Open sticker POD</Link>
              <Link to="/drop-001-live.html" className="cb-button-secondary">Open Drop 001 demo</Link>
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
