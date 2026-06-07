import { CacheConcierge } from "../components/CacheConcierge";

export default function ConciergePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#0a0a0a] text-[#e8e3d6]">
      <header className="shrink-0 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#c4a479] sm:text-xs">dotCache</p>
            <h1 className="truncate text-base font-semibold sm:text-lg">Chat with dotCache</h1>
          </div>
          <a
            href="/cache.html"
            className="shrink-0 rounded-full border border-white/15 px-3 py-2 text-xs text-zinc-300 hover:border-white/30 hover:text-white"
          >
            Shop
          </a>
        </div>
      </header>

      <CacheConcierge embedded className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col" />
    </div>
  );
}
