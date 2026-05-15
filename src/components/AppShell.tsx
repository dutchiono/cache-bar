import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  return (
    <div className="grid h-screen grid-cols-[230px_1fr] grid-rows-[48px_1fr]">
      <div className="flex items-center gap-2 border-b-2 border-r-2 border-black px-4 font-bold">
        <span className="grid h-6 w-6 place-items-center rounded border-2 border-black text-[11px]">
          CB
        </span>
        Cache Bar
      </div>
      <TopBar />
      <Sidebar />
      <main className="overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
