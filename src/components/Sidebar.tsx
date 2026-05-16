import { NavLink } from "react-router-dom";

type Item = { to: string; label: string };
type Group = { label: string; items: Item[] };

const groups: Group[] = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard" }],
  },
  {
    label: "Catalog",
    items: [
      { to: "/products", label: "Products" },
      { to: "/submissions", label: "Submissions" },
      { to: "/creators", label: "Creators" },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/orders", label: "Orders" },
      { to: "/customers", label: "Customers" },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/inventory", label: "Inventory & Fulfillment" },
      { to: "/royalties", label: "Royalties & Payouts" },
    ],
  },
  {
    label: "Treasury",
    items: [
      { to: "/treasury", label: "Treasury & Off-ramp" },
      { to: "/token", label: "Token & Burn" },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/reports", label: "Reports" },
      { to: "/automations", label: "Automations" },
    ],
  },
  {
    label: "Storefront",
    items: [
      { to: "/storefront", label: "Storefront Preview" },
      { to: "/checkout", label: "Checkout Preview" },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/team", label: "Team & Roles" },
      { to: "/settings", label: "Settings" },
    ],
  },
];

const agentItem: Item = { to: "/agent", label: "Eliza Agent" };

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
      <div className="mt-3">
        <SidebarLink {...agentItem} accent />
      </div>
    </nav>
  );
}

function SidebarLink({ to, label, accent }: Item & { accent?: boolean }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
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
