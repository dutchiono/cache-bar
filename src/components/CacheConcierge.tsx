import { useAction } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../convex/_generated/api";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function CacheConcierge() {
  const chat = useAction(api.agent.publicConciergeChat);
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
        "Tell me what this waifu wants to sell. I can help shape the drop, .stash discount, checkout, and fulfillment path.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const content = String(form.get("message") ?? "").trim();
    if (!content || !visitorId) return;

    setMessages((current) => [...current, { role: "user", content }]);
    setBusy(true);
    setError(null);
    event.currentTarget.reset();

    try {
      const reply = await chat({
        visitorId,
        content,
        currentPath: window.location.pathname + window.location.search,
      });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: reply.content,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reach .cache.");
    } finally {
      setBusy(false);
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
            <input
              name="message"
              placeholder="Ask .cache to start a shop..."
              disabled={busy || !visitorId}
              autoComplete="off"
              required
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
