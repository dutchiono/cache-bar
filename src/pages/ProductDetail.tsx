import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = id as Id<"products">;
  const product = useQuery(api.products.get, { id: productId });

  const galleryImages = useMemo(
    () => (product?.demoImageUrls ?? []).filter((url) => url.trim().length > 0),
    [product?.demoImageUrls],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = galleryImages[activeIndex] ?? galleryImages[0] ?? "";

  if (product === undefined)
    return <p className="text-sm text-neutral-500">Loading…</p>;
  if (!product) return <p className="text-sm text-neutral-500">Product not found.</p>;

  return (
    <div>
      <div className="mb-1 text-xs text-neutral-500">
        <Link to="/app/products" className="cb-link">
          Products
        </Link>{" "}
        / {product.title}
      </div>
      <h1 className="cb-display mb-1 text-4xl font-semibold">{product.title}</h1>
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[var(--cb-muted)]">
        <Pill kind="grey">{product.status}</Pill>
        <Pill kind="grey">{product.productType}</Pill>
        <Pill kind={product.makerType === "agent" ? "purple" : "green"}>
          {product.makerType}
        </Pill>
        <span>by {product.creator?.name ?? "(unknown)"}</span>
        <span>· {product.basePrice} {product.currency}</span>
      </div>

      <div className="grid grid-cols-[1.6fr_1fr] gap-4">
        {/* Left: media + description */}
        <div className="flex flex-col gap-4">
          <Card title="Media">
            {galleryImages.length > 0 ? (
              <div className="space-y-2">
                <img
                  src={activeImage}
                  alt={`${product.title} primary`}
                  className="h-[28rem] w-full rounded-md border border-[var(--cb-line)] bg-[var(--cb-charcoal)] object-contain p-2"
                />
                <div className="grid grid-cols-2 gap-2">
                  {galleryImages.map((url, index) => (
                    <button
                      key={url}
                      onClick={() => setActiveIndex(index)}
                      className={[
                        "rounded-md border p-1 text-left",
                        activeImage === url
                          ? "border-[var(--cb-clay)] bg-[rgba(182,95,67,0.1)]"
                          : "border-[var(--cb-line)] bg-white/35 hover:border-[var(--cb-charcoal)]",
                      ].join(" ")}
                    >
                      <img
                        src={url}
                        alt={`${product.title} reference`}
                        className="h-36 w-full rounded bg-[var(--cb-charcoal)] object-contain"
                      />
                    </button>
                  ))}
                </div>
                <div className="rounded-md border border-[var(--cb-line)] bg-white/35 px-3 py-2 text-xs text-[var(--cb-muted)]">
                  Vision references loaded from <code>/public/images/waifu.png</code> and{" "}
                  <code>/public/images/image.png</code>.
                </div>
              </div>
            ) : (
              <div className="grid h-48 place-items-center rounded-md border border-dashed border-[var(--cb-line)] text-sm text-[var(--cb-muted)]">
                {product.imageStorageIds.length === 0
                  ? "No images uploaded yet"
                  : `${product.imageStorageIds.length} image(s)`}
              </div>
            )}
          </Card>
          <Card title="Description">
            <p className="whitespace-pre-wrap text-sm">{product.description || "(empty)"}</p>
          </Card>
        </div>

        {/* Right: provenance + splits + pricing */}
        <div className="flex flex-col gap-4">
          <Card title="Provenance">
            <Row k="Maker" v={product.provenance.makerType} />
            <Row k="Summary" v={product.provenance.summary} />
            {product.provenance.makerType === "agent" && (
              <>
                <Row k="Base model" v={product.provenance.baseModel ?? "—"} mono />
                <Row k="Provider" v={product.provenance.provider ?? "—"} />
                <Row k="Brief" v={product.provenance.brief ?? "—"} />
                <Row k="Seed" v={product.provenance.seed ?? "—"} mono />
                <Row k="Run ID" v={product.provenance.runId ?? "—"} mono />
                <Row
                  k="Generated at"
                  v={
                    product.provenance.generatedAt
                      ? new Date(product.provenance.generatedAt).toISOString()
                      : "—"
                  }
                />
                <Row k="License" v={product.provenance.license ?? "—"} />
              </>
            )}
          </Card>

          <Card title="Royalty splits">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-[var(--cb-muted)]">
                <tr>
                  <th className="pb-1">Payee</th>
                  <th className="pb-1">Role</th>
                  <th className="pb-1 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {product.royaltySplits.map((s, i) => (
                  <tr key={i} className="border-t border-dashed border-[var(--cb-line)]">
                    <td className="py-1">
                      {s.payeeCreatorId ? `Creator ${s.payeeCreatorId}` : "Platform"}
                    </td>
                    <td className="py-1">{s.role}</td>
                    <td className="py-1 text-right font-mono">
                      {s.percent.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Pricing & rails">
            <Row k="Base price" v={`${product.basePrice} ${product.currency}`} />
            <Row
              k="$CACHE discount eligible"
              v={product.tokenDiscountEligible ? "Yes" : "No"}
            />
            <div className="mt-2 flex flex-wrap gap-1">
              <Pill kind="grey">Card</Pill>
              <Pill kind="blue">USDC · Base</Pill>
              <Pill kind="blue">USDC · Solana</Pill>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="cb-panel p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="mb-2">
      <div className="text-[11px] uppercase tracking-wide text-[var(--cb-muted)]">{k}</div>
      <div
        className={`border-b border-dashed border-[var(--cb-line)] py-1 ${mono ? "font-mono text-xs" : "text-sm"}`}
      >
        {v}
      </div>
    </div>
  );
}

function Pill({
  kind,
  children,
}: {
  kind: "purple" | "green" | "grey" | "blue";
  children: React.ReactNode;
}) {
  const colors = {
    purple: "cb-badge-agent",
    green: "cb-badge-human",
    grey: "",
    blue: "border-[rgba(73,108,143,0.35)] bg-[rgba(73,108,143,0.1)] text-[var(--cb-blue)]",
  } as const;
  return (
    <span
      className={`cb-badge ${colors[kind]}`}
    >
      {children}
    </span>
  );
}
