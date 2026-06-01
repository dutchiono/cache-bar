import { useAction } from "convex/react";
import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { api } from "../../convex/_generated/api";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PendingImage = {
  name: string;
  previewUrl: string;
  dataUrl: string;
};

export function CacheConcierge() {
  const chat = useAction(api.agent.publicConciergeChat);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
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
        "Ask what .cache has for sale, ask how DTOUR plugs into the same pack, ask what to send the DTOUR owner, or drop an image here and ask for a one-off t-shirt.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);

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

  return (
    <div className="sf-concierge">
      {open && (
        <section className="sf-concierge-panel" aria-label=".cache concierge">
          <div className="sf-concierge-head">
            <div>
              <div className="sf-kicker">.cache concierge</div>
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
        Talk to .cache
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
