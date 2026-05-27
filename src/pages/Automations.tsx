import { useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export default function Automations() {
  const automations = useQuery(api.automations.list, {});
  const create = useMutation(api.automations.create);
  const setActive = useMutation(api.automations.setActive);
  const runNow = useMutation(api.automations.runNow);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("create");
    setError(null);
    try {
      await create({
        name: String(form.get("name") ?? ""),
        triggerType: String(form.get("triggerType") ?? ""),
        triggerConfigJson: String(form.get("triggerConfigJson") ?? "") || undefined,
        stepsJson: String(form.get("stepsJson") ?? "") || undefined,
        active: form.get("active") === "on",
      });
      event.currentTarget.reset();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create automation.");
    } finally {
      setBusy(null);
    }
  }

  async function toggle(id: Id<"automations">, active: boolean) {
    setBusy(id);
    setError(null);
    try {
      await setActive({ id, active: !active });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update automation.");
    } finally {
      setBusy(null);
    }
  }

  async function run(id: Id<"automations">) {
    setBusy(`run-${id}`);
    setError(null);
    try {
      await runNow({ id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run automation.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="cb-panel-dark p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="cb-kicker text-[var(--cb-gold)]">Ops workflows</p>
            <h1 className="cb-display mt-2 text-4xl font-semibold">Automations</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Store trigger definitions, quick steps, and manual run history in Convex.
            </p>
          </div>
          <button type="button" onClick={() => setOpen((value) => !value)} className="cb-button">
            {open ? "Close" : "New automation"}
          </button>
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {open && (
        <form onSubmit={onSubmit} className="cb-panel p-4 space-y-3">
          <input name="name" className="cb-field" placeholder="Automation name" required />
          <input name="triggerType" className="cb-field" placeholder="Trigger type" required />
          <textarea
            name="triggerConfigJson"
            className="cb-field min-h-20"
            placeholder='Trigger config JSON, e.g. {"schedule":"daily"}'
          />
          <textarea
            name="stepsJson"
            className="cb-field min-h-28"
            placeholder='Steps JSON array, e.g. [{"kind":"action","config":{"task":"send report"}}]'
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked />
            Active
          </label>
          <button type="submit" disabled={busy !== null} className="cb-button">
            {busy === "create" ? "Creating..." : "Save automation"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {(automations ?? []).map((automation) => (
          <section key={automation._id} className="cb-panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{automation.name}</h2>
                  <span className="cb-badge">{automation.active ? "active" : "paused"}</span>
                </div>
                <p className="mt-1 text-sm text-[var(--cb-muted)]">
                  Trigger: {automation.trigger.type}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => toggle(automation._id, automation.active)}
                  className="cb-button-secondary min-h-8 px-3 py-1 text-xs"
                >
                  {automation.active ? "Pause" : "Activate"}
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => run(automation._id)}
                  className="cb-button min-h-8 px-3 py-1 text-xs"
                >
                  {busy === `run-${automation._id}` ? "Running..." : "Run now"}
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3 text-xs text-[var(--cb-muted)]">
                <div className="font-semibold text-[var(--cb-ink)]">Trigger config</div>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono">{JSON.stringify(automation.trigger.config, null, 2)}</pre>
                <div className="mt-3 font-semibold text-[var(--cb-ink)]">Steps</div>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono">{JSON.stringify(automation.steps, null, 2)}</pre>
              </div>
              <div className="space-y-2">
                {automation.runs.map((runItem) => (
                  <div key={runItem._id} className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="cb-badge">{runItem.status}</span>
                      <span className="text-xs text-[var(--cb-muted)]">
                        {new Date(runItem._creationTime).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-[var(--cb-muted)]">
                      {runItem.log.map((entry, index) => (
                        <div key={`${runItem._id}-${index}`}>
                          {new Date(entry.at).toLocaleTimeString()} · {entry.step} · {entry.detail}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {automation.runs.length === 0 && <Empty>No runs yet.</Empty>}
              </div>
            </div>
          </section>
        ))}
        {automations?.length === 0 && <Empty>No automations yet.</Empty>}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed border-[var(--cb-line)] p-3 text-sm text-[var(--cb-muted)]">{children}</div>;
}
