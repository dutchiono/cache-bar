import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type Submission = NonNullable<
  ReturnType<typeof useQuery<typeof api.submissions.list>>
>[number];

const columns: { key: Submission["status"]; label: string }[] = [
  { key: "new", label: "New" },
  { key: "prescreened", label: "Eliza Prescreened" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function Submissions() {
  const submissions = useQuery(api.submissions.list, {});
  const draftProducts = useQuery(api.products.list, { status: "draft" });
  const submit = useMutation(api.submissions.submit);
  const markPrescreened = useMutation(api.submissions.markPrescreened);
  const decide = useMutation(api.submissions.decide);
  const seedVisionDemo = useMutation(api.products.seedVisionDemo);

  const [selectedDraft, setSelectedDraft] = useState<Id<"products"> | "">("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const byStatus = useMemo(() => {
    const grouped = new Map<Submission["status"], Submission[]>();
    for (const c of columns) grouped.set(c.key, []);
    for (const s of submissions ?? []) grouped.get(s.status)?.push(s);
    return grouped;
  }, [submissions]);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="cb-panel-dark p-4">
        <p className="cb-kicker text-[var(--cb-gold)]">Catalog desk</p>
        <h1 className="cb-display mt-2 text-3xl font-semibold tracking-wide">Submissions / Review Queue</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Draft products move through New → Prescreened → Approved/Rejected.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={selectedDraft}
            onChange={(e) => setSelectedDraft(e.target.value as Id<"products"> | "")}
            className="min-w-72 rounded-md border border-white/15 bg-black/50 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="">Select a draft product to submit…</option>
            {draftProducts?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.title}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              run("submit", async () => {
                if (!selectedDraft) throw new Error("Pick a draft product first.");
                await submit({ productId: selectedDraft });
                setSelectedDraft("");
              })
            }
            disabled={busy !== null}
            className="cb-button bg-[var(--cb-paper-soft)] text-[var(--cb-ink)] hover:bg-white"
          >
            {busy === "submit" ? "Submitting…" : "Submit Draft"}
          </button>
          <button
            onClick={() => run("seed", async () => void (await seedVisionDemo({})))}
            disabled={busy !== null}
            className="cb-button-secondary border-white/15 bg-transparent text-zinc-200 hover:bg-white/10"
          >
            {busy === "seed" ? "Seeding…" : "Seed Vision Demo Product"}
          </button>
        </div>
        {err && <p className="mt-3 text-sm text-rose-300">{err}</p>}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => (
          <section
            key={col.key}
            className="cb-panel p-3"
          >
            <h2 className="cb-kicker mb-3">
              {col.label}
            </h2>
            <div className="space-y-2">
              {(byStatus.get(col.key) ?? []).map((s) => (
                <article
                  key={s._id}
                  className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3"
                >
                  <div className="text-sm font-semibold">{s.productTitle}</div>
                  <div className="mt-1 text-xs text-[var(--cb-muted)]">
                    {s.creatorName} · {s.makerType}
                  </div>
                  {s.elizaPrescreen?.notes && (
                    <p className="mt-2 line-clamp-4 text-xs text-[var(--cb-muted)]">
                      {s.elizaPrescreen.notes}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.status === "new" && (
                      <button
                        onClick={() =>
                          run(`prescreen-${s._id}`, () =>
                            markPrescreened({ submissionId: s._id }),
                          )
                        }
                        disabled={busy !== null}
                        className="rounded border border-[rgba(73,108,143,0.35)] bg-[rgba(73,108,143,0.1)] px-2 py-1 text-[11px] text-[var(--cb-blue)] disabled:opacity-40"
                      >
                        Prescreen
                      </button>
                    )}
                    {(s.status === "new" || s.status === "prescreened") && (
                      <>
                        <button
                          onClick={() =>
                            run(`approve-${s._id}`, () =>
                              decide({ submissionId: s._id, decision: "approved" }),
                            )
                          }
                          disabled={busy !== null}
                          className="rounded border border-[rgba(79,143,122,0.35)] bg-[rgba(79,143,122,0.12)] px-2 py-1 text-[11px] text-[#245443] disabled:opacity-40"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            run(`reject-${s._id}`, () =>
                              decide({
                                submissionId: s._id,
                                decision: "rejected",
                                rejectionReason: "Needs stronger print hierarchy.",
                              }),
                            )
                          }
                          disabled={busy !== null}
                          className="rounded border border-[rgba(169,56,56,0.35)] bg-[rgba(169,56,56,0.1)] px-2 py-1 text-[11px] text-[var(--cb-danger)] disabled:opacity-40"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
              {(byStatus.get(col.key) ?? []).length === 0 && (
                <div className="rounded-lg border border-dashed border-zinc-800 p-3 text-xs text-zinc-500">
                  Empty
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
