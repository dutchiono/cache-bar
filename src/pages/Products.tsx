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
          className={`rounded-full border px-2 py-0.5 text-[11px] ${r.makerType === "agent" ? "border-purple-300 bg-purple-50" : "border-green-300 bg-green-50"}`}
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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-neutral-500">
            Catalog — human and agent-made
          </p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded border-2 border-black bg-black px-3 py-1.5 text-sm font-semibold text-white"
        >
          {open ? "Cancel" : "+ New product"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={onSubmit}
          className="mb-6 rounded-lg border-2 border-black bg-white p-4"
        >
          <div className="grid grid-cols-3 gap-3">
            <Field label="Title" name="title" required />
            <Field label="Category" name="category" required />
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-neutral-600">Type</span>
              <select
                name="productType"
                defaultValue="physical"
                className="rounded border border-neutral-400 px-2 py-1"
              >
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
              </select>
            </label>
            <label className="col-span-3 flex flex-col gap-1 text-sm">
              <span className="text-xs text-neutral-600">Description</span>
              <textarea
                name="description"
                rows={2}
                className="rounded border border-neutral-400 px-2 py-1"
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
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-neutral-600">Creator</span>
              <select
                value={creatorId}
                onChange={(e) =>
                  setCreatorId(e.target.value as Id<"creators"> | "")
                }
                required
                className="rounded border border-neutral-400 px-2 py-1"
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

          <hr className="my-4 border-neutral-200" />

          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">
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
                    className="rounded border border-neutral-400 px-2 py-1"
                  />
                </label>
              </>
            )}
          </div>

          <hr className="my-4 border-neutral-200" />

          <SplitsEditor
            value={splits}
            onChange={setSplits}
            creators={creators ?? []}
          />

          {err && (
            <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded border-2 border-black bg-black px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Saving draft…" : "Create draft"}
            </button>
          </div>
        </form>
      )}

      <RecordTable<Product>
        rows={products}
        columns={columns}
        rowHref={(r) => `/products/${r._id}`}
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
      <span className="text-xs text-neutral-600">{label}</span>
      <input {...rest} className="rounded border border-neutral-400 px-2 py-1" />
    </label>
  );
}
