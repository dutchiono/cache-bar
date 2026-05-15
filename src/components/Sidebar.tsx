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
    <nav className="overflow-y-auto border-r border-zinc-800 bg-black/80 p-2">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="px-2 pb-1 pt-3 text-[11px] uppercase tracking-wide text-zinc-500">
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
          "block rounded px-2.5 py-1.5 text-sm text-zinc-200",
          isActive
            ? "border border-fuchsia-500/60 bg-fuchsia-500/15 font-semibold text-zinc-100"
            : "border border-transparent hover:bg-zinc-900",
          accent ? "border border-fuchsia-500/50 bg-fuchsia-500/10" : "",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}
