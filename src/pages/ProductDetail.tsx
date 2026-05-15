import { useQuery } from "convex/react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = id as Id<"products">;
  const product = useQuery(api.products.get, { id: productId });

  if (product === undefined)
    return <p className="text-sm text-neutral-500">Loading…</p>;
  if (!product) return <p className="text-sm text-neutral-500">Product not found.</p>;

  return (
    <div>
      <div className="mb-1 text-xs text-neutral-500">
        <Link to="/products" className="underline">
          Products
        </Link>{" "}
        / {product.title}
      </div>
      <h1 className="mb-1 text-2xl font-bold">{product.title}</h1>
      <div className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
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
            <div className="grid h-48 place-items-center rounded border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-500">
              {product.imageStorageIds.length === 0
                ? "No images uploaded yet"
                : `${product.imageStorageIds.length} image(s)`}
            </div>
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
              <thead className="text-left text-[11px] uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="pb-1">Payee</th>
                  <th className="pb-1">Role</th>
                  <th className="pb-1 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {product.royaltySplits.map((s, i) => (
                  <tr key={i} className="border-t border-dashed border-neutral-200">
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
    <div className="rounded-lg border-2 border-black bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="mb-2">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{k}</div>
      <div
        className={`border-b border-dashed border-neutral-300 py-1 ${mono ? "font-mono text-xs" : "text-sm"}`}
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
    purple: "border-purple-300 bg-purple-50",
    green: "border-green-300 bg-green-50",
    grey: "border-neutral-300 bg-neutral-100",
    blue: "border-blue-300 bg-blue-50",
  } as const;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] ${colors[kind]}`}
    >
      {children}
    </span>
  );
}
