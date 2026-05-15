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
      <div className="rounded-2xl border border-fuchsia-500/30 bg-gradient-to-r from-black via-zinc-950 to-black p-4 text-zinc-100">
        <h1 className="text-2xl font-semibold tracking-wide">Submissions / Review Queue</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Draft products move through New → Prescreened → Approved/Rejected.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={selectedDraft}
            onChange={(e) => setSelectedDraft(e.target.value as Id<"products"> | "")}
            className="min-w-72 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
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
            className="rounded-md border border-fuchsia-400/60 bg-fuchsia-500/10 px-3 py-2 text-sm font-semibold text-fuchsia-200 disabled:opacity-40"
          >
            {busy === "submit" ? "Submitting…" : "Submit Draft"}
          </button>
          <button
            onClick={() => run("seed", async () => void (await seedVisionDemo({})))}
            disabled={busy !== null}
            className="rounded-md border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 disabled:opacity-40"
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
            className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3"
          >
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              {col.label}
            </h2>
            <div className="space-y-2">
              {(byStatus.get(col.key) ?? []).map((s) => (
                <article
                  key={s._id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3"
                >
                  <div className="text-sm font-semibold text-zinc-100">{s.productTitle}</div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {s.creatorName} · {s.makerType}
                  </div>
                  {s.elizaPrescreen?.notes && (
                    <p className="mt-2 text-xs text-zinc-300 line-clamp-4">
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
                        className="rounded border border-cyan-500/50 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200 disabled:opacity-40"
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
                          className="rounded border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200 disabled:opacity-40"
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
                          className="rounded border border-rose-500/50 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200 disabled:opacity-40"
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

