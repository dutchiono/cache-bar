import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <div className="grid h-screen grid-cols-[260px_1fr] grid-rows-[64px_1fr] text-[var(--cb-ink)]">
      <div className="flex items-center gap-3 border-b border-r border-[var(--cb-line)] bg-[var(--cb-paper-soft)] px-5">
        <span className="grid h-8 w-8 place-items-center rounded-md border border-[var(--cb-charcoal)] bg-[var(--cb-charcoal)] text-[11px] font-bold text-[var(--cb-paper-soft)]">
          CB
        </span>
        <span className="cb-display text-xl font-semibold">Cache Bar</span>
        <span className="cb-badge rounded-md px-2 py-0.5 text-[10px]">
          ops
        </span>
      </div>
      <TopBar />
      <Sidebar />
      <main className="overflow-y-auto p-6">
        <div className="mx-auto max-w-[1500px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
