import { useAction } from "convex/react";
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { api } from "../../convex/_generated/api";
import "../storefront.css";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PendingImage = {
  name: string;
  previewUrl: string;
  dataUrl: string;
};

export function CacheConcierge({
  embedded = false,
  className = "",
}: {
  embedded?: boolean;
  className?: string;
}) {
  const chat = useAction(api.agent.publicConciergeChat);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(embedded);
  const [visitorId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const key = "cache.concierge.visitor";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const next = `web-${crypto.randomUUID()}`;
    window.localStorage.setItem(key, next);
    return next;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I'm dotCache. One live product right now — the Cozy Devs Sticker Pack (Moon Seal, Floppy, Bus Riot). Ask what's in the shop, pricing, or checkout.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);

  useEffect(() => {
    if (!embedded || !logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [embedded, messages, busy]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const content = String(form.get("message") ?? "").trim();
    if ((!content && !pendingImage) || !visitorId) return;

    const userMessage =
      content || `Make this a t-shirt: ${pendingImage?.name ?? "uploaded image"}`;
    setMessages((current) => [...current, { role: "user", content: userMessage }]);
    setBusy(true);
    setError(null);
    event.currentTarget.reset();

    try {
      const reply = await chat({
        visitorId,
        content,
        currentPath: window.location.pathname + window.location.search,
        imageDataUrl: pendingImage?.dataUrl,
        imageName: pendingImage?.name,
      });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: reply.content,
        },
      ]);
      setPendingImage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reach .cache.");
    } finally {
      setBusy(false);
    }
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await setPendingFile(file);
    event.target.value = "";
  }

  async function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await setPendingFile(file);
  }

  async function setPendingFile(file: File) {
    try {
      setError(null);
      const prepared = await prepareImage(file);
      setPendingImage(prepared);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to prepare image.");
    }
  }

  if (embedded) {
    return (
      <div className={className}>
        <div
          ref={logRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6"
          aria-live="polite"
        >
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[88%] rounded-2xl border px-3 py-2.5 text-sm leading-relaxed sm:px-4 sm:py-3 ${
                message.role === "user"
                  ? "ml-auto border-[#c4a479]/40 bg-[#c4a479] text-[#111110]"
                  : "mr-auto border-white/10 bg-white/[0.04] text-zinc-200"
              }`}
            >
              {message.content}
            </div>
          ))}
          {busy && (
            <div className="mr-auto max-w-[88%] rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-zinc-400">
              Checking the shop context…
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-[#0a0a0a] px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6">
          {error && (
            <p className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <form onSubmit={onSubmit} className="space-y-2">
            {pendingImage && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2">
                <img
                  src={pendingImage.previewUrl}
                  alt={pendingImage.name}
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{pendingImage.name}</p>
                  <button
                    type="button"
                    onClick={() => setPendingImage(null)}
                    disabled={busy}
                    className="mt-1 text-xs text-zinc-400 underline hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || !visitorId}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-lg text-zinc-300 hover:border-white/30 hover:text-white disabled:opacity-40"
                aria-label="Attach image"
                title="Attach image"
              >
                +
              </button>
              <label className="sr-only" htmlFor="cache-concierge-message">
                Message dotCache
              </label>
              <textarea
                id="cache-concierge-message"
                name="message"
                rows={1}
                placeholder="Ask about the sticker pack, checkout, or fulfillment…"
                disabled={busy || !visitorId}
                autoComplete="off"
                enterKeyHint="send"
                className="min-h-11 max-h-32 min-w-0 flex-1 resize-none rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-base text-[#e8e3d6] placeholder:text-zinc-500 focus:border-[#c4a479]/50 focus:outline-none disabled:opacity-40 sm:text-sm"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button
                type="submit"
                disabled={busy || !visitorId}
                className="flex h-11 shrink-0 items-center justify-center rounded-full bg-[#c4a479] px-5 text-sm font-semibold text-[#111110] disabled:opacity-40"
              >
                Send
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => void onFileChange(event)}
              hidden
            />
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="sf-concierge">
      {open && (
        <section className="sf-concierge-panel" aria-label=".cache concierge">
          <div className="sf-concierge-head">
            <div>
              <div className="sf-kicker">dotCache · Eliza Cloud</div>
              <strong>Shop desk</strong>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close .cache chat">
              Close
            </button>
          </div>

          <div className="sf-concierge-log">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`sf-concierge-message is-${message.role}`}
              >
                {message.content}
              </div>
            ))}
            {busy && <div className="sf-concierge-message is-assistant">Checking the shop context...</div>}
          </div>

          {error && <div className="sf-error">{error}</div>}

          <form onSubmit={onSubmit} className="sf-concierge-form">
            {pendingImage && (
              <div className="sf-concierge-attachment">
                <img src={pendingImage.previewUrl} alt={pendingImage.name} />
                <div>
                  <strong>{pendingImage.name}</strong>
                  <button type="button" onClick={() => setPendingImage(null)} disabled={busy}>
                    Remove
                  </button>
                </div>
              </div>
            )}
            <button
              type="button"
              className={`sf-concierge-dropzone${pendingImage ? " has-image" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => void onDrop(event)}
              disabled={busy || !visitorId}
            >
              {pendingImage ? "Image ready for Teemill custom shirt" : "Drop image here or click to add one"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => void onFileChange(event)}
              hidden
            />
            <input
              name="message"
              placeholder="Ask what .cache has for sale, claim a sticker pack, or ask for a t-shirt..."
              disabled={busy || !visitorId}
              autoComplete="off"
            />
            <button type="submit" disabled={busy || !visitorId}>
              Send
            </button>
          </form>
        </section>
      )}

      <button type="button" className="sf-concierge-button" onClick={() => setOpen((value) => !value)}>
        Talk to dotCache
      </button>
    </div>
  );
}

async function prepareImage(file: File): Promise<PendingImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are supported here.");
  }

  const bitmap = await createImageBitmap(file);
  const maxDimension = 1400;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Unable to prepare image canvas.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  return {
    name: file.name,
    previewUrl: dataUrl,
    dataUrl,
  };
}
