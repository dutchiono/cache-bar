import { useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export default function AgentConsole() {
  const threads = useQuery(api.agent.listThreads, {});
  const createThread = useMutation(api.agent.createThread);
  const postMessage = useMutation(api.agent.postMessage);
  const [threadId, setThreadId] = useState<Id<"agentThreads"> | null>(null);
  const activeThreadId = threadId ?? threads?.[0]?._id ?? null;
  const thread = useQuery(api.agent.getThread, activeThreadId ? { id: activeThreadId } : "skip");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onCreateThread() {
    setBusy("thread");
    setError(null);
    try {
      const id = await createThread({ surface: "ops_console", contextRef: "manual" });
      setThreadId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create thread.");
    } finally {
      setBusy(null);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeThreadId) return;
    const form = new FormData(event.currentTarget);
    setBusy("message");
    setError(null);
    try {
      await postMessage({
        threadId: activeThreadId,
        content: String(form.get("content") ?? ""),
      });
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="cb-panel-dark p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="cb-kicker text-[var(--cb-gold)]">Ops copilot</p>
            <h1 className="cb-display mt-2 text-4xl font-semibold">Agent Console</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Internal thread storage for operator notes, backend actions, and future agent wiring.
            </p>
          </div>
          <button type="button" disabled={busy !== null} onClick={onCreateThread} className="cb-button">
            {busy === "thread" ? "Creating..." : "New thread"}
          </button>
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="cb-panel p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Threads</h2>
          <div className="space-y-2">
            {(threads ?? []).map((candidate) => (
              <button
                key={candidate._id}
                type="button"
                onClick={() => setThreadId(candidate._id)}
                className={[
                  "block w-full rounded-md border p-3 text-left transition",
                  activeThreadId === candidate._id
                    ? "border-[var(--cb-charcoal)] bg-[var(--cb-charcoal)] text-[var(--cb-paper-soft)]"
                    : "border-[var(--cb-line)] bg-white/35 hover:bg-white/70",
                ].join(" ")}
              >
                <div className="font-medium">{candidate.surface}</div>
                <div className="mt-1 text-xs opacity-75">
                  {new Date(candidate._creationTime).toLocaleString()}
                </div>
              </button>
            ))}
            {threads?.length === 0 && <Empty>No threads yet.</Empty>}
          </div>
        </aside>

        <section className="cb-panel p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Messages</h2>
          <div className="space-y-2">
            {(thread?.messages ?? []).map((message) => (
              <div key={message._id} className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="cb-badge">{message.role}</span>
                  <span className="text-xs text-[var(--cb-muted)]">
                    {new Date(message._creationTime).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm">{message.content}</div>
              </div>
            ))}
            {activeThreadId && thread?.messages.length === 0 && <Empty>No messages in this thread.</Empty>}
            {!activeThreadId && <Empty>Create a thread to start using the console.</Empty>}
          </div>

          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <textarea
              name="content"
              className="cb-field min-h-24"
              placeholder="Ask for inventory, refunds, routing, or leave an ops note."
              disabled={!activeThreadId || busy !== null}
              required
            />
            <button type="submit" disabled={!activeThreadId || busy !== null} className="cb-button">
              {busy === "message" ? "Sending..." : "Send message"}
            </button>
          </form>
        </section>
      </section>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed border-[var(--cb-line)] p-3 text-sm text-[var(--cb-muted)]">{children}</div>;
}
