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
    <nav className="overflow-y-auto border-r-2 border-black p-2">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="px-2 pb-1 pt-3 text-[11px] uppercase tracking-wide text-neutral-500">
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
          "block rounded px-2.5 py-1.5 text-sm",
          isActive
            ? "border border-black bg-neutral-100 font-semibold"
            : "border border-transparent hover:bg-neutral-50",
          accent ? "border-purple-400 bg-purple-50" : "",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}
