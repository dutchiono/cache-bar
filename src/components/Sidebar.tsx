import { NavLink } from "react-router-dom";

type Item = { to: string; label: string };
type Group = { label: string; items: Item[] };

const groups: Group[] = [
  {
    label: "Overview",
    items: [{ to: "/app", label: "Dashboard" }],
  },
  {
    label: "Catalog",
    items: [
      { to: "/app/products", label: "Products" },
      { to: "/app/submissions", label: "Review Queue" },
      { to: "/app/creators", label: "Creators" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { to: "/app/orders", label: "Orders" },
      { to: "/app/customers", label: "Customers" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/app/inventory", label: "Inventory & Fulfillment" },
      { to: "/app/royalties", label: "Royalties & Payouts" },
      { to: "/app/reports", label: "Reports" },
      { to: "/app/automations", label: "Automations" },
      { to: "/app/agent", label: "Agent Console" },
    ],
  },
  {
    label: "Treasury",
    items: [
      { to: "/app/treasury", label: "Treasury & Off-ramp" },
      { to: "/app/stash", label: ".stash" },
    ],
  },
  {
    label: "Storefront",
    items: [
      { to: "/", label: "Live Storefront" },
      { to: "/stash", label: "Public .stash" },
      { to: "/checkout", label: "Live Checkout" },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/app/team", label: "Team & Roles" },
      { to: "/app/settings", label: "Settings" },
    ],
  },
];

export function Sidebar() {
  return (
    <nav className="overflow-y-auto border-r border-[var(--cb-line)] bg-[rgba(251,247,239,0.72)] p-3">
      {groups.map((g) => (
        <div key={g.label} className="mb-2">
          <div className="cb-kicker px-2 pb-1 pt-3">
            {g.label}
          </div>
          {g.items.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </div>
      ))}
    </nav>
  );
}

function SidebarLink({ to, label, accent }: Item & { accent?: boolean }) {
  return (
    <NavLink
      to={to}
      end={to === "/" || to === "/app"}
      className={({ isActive }) =>
        [
          "block rounded-md border px-3 py-2 text-sm font-medium transition",
          isActive
            ? "border-[var(--cb-charcoal)] bg-[var(--cb-charcoal)] text-[var(--cb-paper-soft)]"
            : "border-transparent text-[var(--cb-muted)] hover:border-[var(--cb-line)] hover:bg-[var(--cb-paper-soft)] hover:text-[var(--cb-ink)]",
          accent ? "border-[rgba(182,95,67,0.35)] bg-[rgba(182,95,67,0.1)] text-[var(--cb-clay)]" : "",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}
