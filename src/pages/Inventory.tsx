import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { RecordTable, type Column } from "../components/RecordTable";

type InventoryRow = NonNullable<ReturnType<typeof useQuery<typeof api.inventory.listOverview>>>[number];

export default function Inventory() {
  const rows = useQuery(api.inventory.listOverview, {});

  const columns: Column<InventoryRow>[] = [
    {
      header: "Product",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.product?.title ?? "Unknown product"}</div>
          <div className="text-xs text-[var(--cb-muted)]">{row.variant?.optionLabel ?? "No variant label"}</div>
        </div>
      ),
    },
    { header: "SKU", cell: (row) => row.variant?.sku ?? "—" },
    { header: "On hand", cell: (row) => String(row.onHand), width: "w-20" },
    { header: "Reserved", cell: (row) => String(row.reserved), width: "w-20" },
    { header: "Available", cell: (row) => String(row.available), width: "w-20" },
    { header: "Reorder", cell: (row) => String(row.reorderPoint), width: "w-20" },
    {
      header: "Status",
      cell: (row) => (
        <span className={`cb-badge ${row.needsReorder ? "cb-badge-agent" : ""}`}>
          {row.needsReorder ? "needs reorder" : "healthy"}
        </span>
      ),
      width: "w-28",
    },
    { header: "Location", cell: (row) => row.location ?? "—" },
  ];

  return (
    <div className="space-y-5">
      <section className="cb-panel-dark p-5">
        <p className="cb-kicker text-[var(--cb-gold)]">Fulfillment stock</p>
        <h1 className="cb-display mt-2 text-4xl font-semibold">Inventory</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Live variant availability, reservations from checkout, and reorder pressure.
        </p>
      </section>

      <RecordTable<InventoryRow> rows={rows} columns={columns} empty="No inventory rows yet." />
    </div>
  );
}
