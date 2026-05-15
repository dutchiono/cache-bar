import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <div className="grid h-screen grid-cols-[250px_1fr] grid-rows-[56px_1fr] bg-zinc-950 text-zinc-100">
      <div className="flex items-center gap-2 border-b border-r border-zinc-800 bg-black px-4 font-bold tracking-wide">
        <span className="grid h-6 w-6 place-items-center rounded border border-fuchsia-500 text-[11px] text-fuchsia-300">
          CB
        </span>
        <span className="text-zinc-100">Cache Bar</span>
        <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] font-normal text-zinc-400">
          ops
        </span>
      </div>
      <TopBar />
      <Sidebar />
      <main className="overflow-y-auto bg-[radial-gradient(circle_at_20%_0%,rgba(217,70,239,0.12),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.12),transparent_34%)] p-6">
        <Outlet />
      </main>
    </div>
  );
}
