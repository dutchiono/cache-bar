import { CacheConcierge } from "../components/CacheConcierge";

export default function ConciergePage() {
  return (
    <div className="min-h-screen bg-[var(--cb-bg,#0a0a0a)] text-[var(--cb-fg,#e8e3d6)]">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--cb-gold,#c4a479)]">dotCache</p>
            <h1 className="text-xl font-semibold">Same agent as Telegram & ops console</h1>
          </div>
          <a href="/cache.html" className="text-sm text-zinc-400 hover:text-white">
            ← Shop
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <p className="mb-6 text-sm text-zinc-400">
          Browse stickers on the shop page, or ask dotCache here. Powered by your Eliza Cloud agent when configured.
        </p>
        <CacheConcierge embedded />
      </main>
    </div>
  );
}
