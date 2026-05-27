import { useMutation, useQuery } from "convex/react";
import { useMemo, useState, type FormEvent } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { RecordTable, type Column } from "../components/RecordTable";
import { SplitsEditor, type Split } from "../components/SplitsEditor";

type Product = NonNullable<ReturnType<typeof useQuery<typeof api.products.list>>>[number];

export default function Products() {
  const products = useQuery(api.products.list, {});
  const creators = useQuery(api.creators.list, {});
  const createDraft = useMutation(api.products.createDraft);
  const seedVisionDemo = useMutation(api.products.seedVisionDemo);

  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [creatorId, setCreatorId] = useState<Id<"creators"> | "">("");
  const [splits, setSplits] = useState<Split[]>([
    { role: "creator", percent: 90 },
    { role: "platform", percent: 10 },
  ]);

  const selectedCreator = useMemo(
    () => creators?.find((c) => c._id === creatorId),
    [creators, creatorId],
  );
  const isAgent = selectedCreator?.type === "agent";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);

    try {
      if (!creatorId) throw new Error("Pick a creator.");
      if (!selectedCreator) throw new Error("Creator not loaded.");

      const provenance: {
        makerType: "human" | "agent";
        summary: string;
        baseModel?: string;
        provider?: string;
        brief?: string;
        seed?: string;
        runId?: string;
        generatedAt?: number;
        license?: string;
      } = {
        makerType: selectedCreator.type,
        summary: (fd.get("summary") as string) ?? "",
      };
      if (isAgent) {
        provenance.baseModel = fd.get("baseModel") as string;
        provenance.provider = fd.get("provider") as string;
        provenance.brief = fd.get("brief") as string;
        provenance.seed = fd.get("seed") as string;
        provenance.runId = fd.get("runId") as string;
        const ga = fd.get("generatedAt") as string;
        provenance.generatedAt = ga ? new Date(ga).getTime() : Date.now();
        provenance.license = fd.get("license") as string;
      }

      await createDraft({
        title: fd.get("title") as string,
        description: (fd.get("description") as string) ?? "",
        productType: fd.get("productType") as "physical" | "digital",
        category: fd.get("category") as string,
        creatorId,
        basePrice: Number(fd.get("basePrice") ?? 0),
        currency: (fd.get("currency") as string) || "USD",
        demoImageUrls: ((fd.get("demoImageUrls") as string) || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        tokenDiscountEligible: fd.get("tokenDiscountEligible") === "on",
        provenance,
        royaltySplits: splits,
      });

      (e.currentTarget as HTMLFormElement).reset();
      setSplits([
        { role: "creator", percent: 90 },
        { role: "platform", percent: 10 },
      ]);
      setCreatorId("");
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed.");
    } finally {
      setPending(false);
    }
  }

  const columns: Column<Product>[] = [
    {
      header: "Preview",
      cell: (r) => {
        const src = r.demoImageUrls?.[0];
        if (!src) return <span className="text-xs text-neutral-400">—</span>;
        return (
          <img
            src={src}
            alt={r.title}
            className="h-12 w-12 rounded-md border border-neutral-300 bg-zinc-900 object-contain p-0.5"
          />
        );
      },
      width: "w-16",
    },
    {
      header: "Title",
      cell: (r) => <span className="font-medium">{r.title}</span>,
    },
    {
      header: "Type",
      cell: (r) => r.productType,
      width: "w-20",
    },
    {
      header: "Maker",
      cell: (r) => (
        <span
          className={`cb-badge ${r.makerType === "agent" ? "cb-badge-agent" : "cb-badge-human"}`}
        >
          {r.makerType}
        </span>
      ),
      width: "w-24",
    },
    { header: "Category", cell: (r) => r.category },
    {
      header: "Price",
      cell: (r) => `${r.basePrice} ${r.currency}`,
      width: "w-24",
    },
    {
      header: "Status",
      cell: (r) => r.status,
      width: "w-24",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="cb-panel-dark overflow-hidden">
        <div className="grid gap-3 p-4 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="cb-kicker text-[var(--cb-gold)]">Vision Capsule</p>
            <h2 className="cb-display mt-2 text-3xl font-semibold tracking-wide text-[var(--cb-paper-soft)]">
              Vision Capsule / Demo Direction
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Dark web-punk oversized tee language: washed black, pink accents, heavy typography,
              anime-core front/back narrative.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => void seedVisionDemo({})}
                className="cb-button bg-[var(--cb-paper-soft)] text-[var(--cb-ink)] hover:bg-white"
              >
                Seed Vision Demo Product
              </button>
              <span className="rounded-md border border-white/15 px-2.5 py-2 text-xs text-zinc-400">
                Uses: <code>/public/images/waifu.png</code> + <code>/public/images/image.png</code>
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <img
              src="/images/waifu.png"
              alt="Waifu.fun tee reference"
              className="h-40 w-full rounded-md border border-white/15 bg-black object-contain p-1"
            />
            <img
              src="/images/image.png"
              alt="Capsule collection board reference"
              className="h-40 w-full rounded-md border border-white/15 bg-black object-contain p-1"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="cb-display text-3xl font-semibold">Products</h1>
          <p className="text-sm text-[var(--cb-muted)]">
            Catalog — human and agent-made
          </p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="cb-button"
        >
          {open ? "Cancel" : "+ New product"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={onSubmit}
          className="cb-panel p-4"
        >
          <div className="grid grid-cols-3 gap-3">
            <Field label="Title" name="title" required />
            <Field label="Category" name="category" required />
            <label className="flex flex-col gap-1 text-sm">
              <span className="cb-label">Type</span>
              <select
                name="productType"
                defaultValue="physical"
                className="cb-field"
              >
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
              </select>
            </label>
            <label className="col-span-3 flex flex-col gap-1 text-sm">
              <span className="cb-label">Description</span>
              <textarea
                name="description"
                rows={2}
                className="cb-field"
              />
            </label>
            <Field
              label="Base price"
              name="basePrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              required
            />
            <Field label="Currency" name="currency" defaultValue="USD" required />
            <Field
              label="Demo image URLs (csv)"
              name="demoImageUrls"
              placeholder="/images/waifu.png, /images/image.png"
            />
            <label className="flex flex-col gap-1 text-sm">
              <span className="cb-label">Creator</span>
              <select
                value={creatorId}
                onChange={(e) =>
                  setCreatorId(e.target.value as Id<"creators"> | "")
                }
                required
                className="cb-field"
              >
                <option value="" disabled>
                  Pick creator…
                </option>
                {creators?.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="tokenDiscountEligible"
                defaultChecked
              />
              <span>$CACHE discounts apply to this product</span>
            </label>
          </div>

          <hr className="my-4 border-[var(--cb-line)]" />

          <h3 className="cb-kicker mb-2">
            Provenance ({isAgent ? "agent-made" : "human-made"})
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Summary" name="summary" required />
            {isAgent && (
              <>
                <Field label="Base model" name="baseModel" required />
                <Field label="Provider" name="provider" required />
                <Field label="Seed" name="seed" required />
                <Field label="Run ID" name="runId" required />
                <Field
                  label="Generated at"
                  name="generatedAt"
                  type="datetime-local"
                  required
                />
                <Field label="License" name="license" required />
                <label className="col-span-2 flex flex-col gap-1 text-sm">
                  <span className="text-xs text-neutral-600">Brief</span>
                  <textarea
                    name="brief"
                    rows={2}
                    required
                    className="cb-field"
                  />
                </label>
              </>
            )}
          </div>

          <hr className="my-4 border-[var(--cb-line)]" />

          <SplitsEditor
            value={splits}
            onChange={setSplits}
            creators={creators ?? []}
          />

          {err && (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="submit"
              disabled={pending}
              className="cb-button"
            >
              {pending ? "Saving draft…" : "Create draft"}
            </button>
          </div>
        </form>
      )}

      <RecordTable<Product>
        rows={products}
        columns={columns}
        rowHref={(r) => `/app/products/${r._id}`}
        empty="No products yet. Click '+ New product' above (after creating at least one creator)."
      />
    </div>
  );
}

function Field(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
  const { label, ...rest } = props;
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="cb-label">{label}</span>
      <input {...rest} className="cb-field" />
    </label>
  );
}
