import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { RecordTable, type Column } from "../components/RecordTable";

type Customer = NonNullable<ReturnType<typeof useQuery<typeof api.customers.list>>>[number];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function Customers() {
  const customers = useQuery(api.customers.list, {});

  const columns: Column<Customer>[] = [
    {
      header: "Customer",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-[var(--cb-muted)]">{row.email ?? "No email"}</div>
        </div>
      ),
    },
    {
      header: "Wallets",
      cell: (row) => String(row.wallets.length),
      width: "w-20",
    },
    {
      header: "Segments",
      cell: (row) => row.segments.join(", ") || "—",
    },
    {
      header: "LTV",
      cell: (row) => money.format(row.lifetimeValue),
      width: "w-24",
    },
    {
      header: "Orders",
      cell: (row) => String(row.orderCount),
      width: "w-20",
    },
    {
      header: "Latest activity",
      cell: (row) => row.latestActivity?.body ?? "—",
    },
  ];

  return (
    <div className="space-y-5">
      <section className="cb-panel-dark p-5">
        <p className="cb-kicker text-[var(--cb-gold)]">CRM</p>
        <h1 className="cb-display mt-2 text-4xl font-semibold">Customers</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Wallet-aware customer records, order history, and support activity.
        </p>
      </section>

      <RecordTable<Customer>
        rows={customers}
        columns={columns}
        rowHref={(row) => `/app/customers/${row._id}`}
        empty="No customers yet."
      />
    </div>
  );
}
