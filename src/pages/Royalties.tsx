import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function Royalties() {
  const overview = useQuery(api.royalties.overview, {});
  const createPayout = useMutation(api.royalties.createPayout);
  const setPayoutStatus = useMutation(api.royalties.setPayoutStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(label: string, task: () => Promise<unknown>) {
    setBusy(label);
    setError(null);
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Royalty action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="cb-panel-dark p-5">
        <p className="cb-kicker text-[var(--cb-gold)]">Royalty ledger</p>
        <h1 className="cb-display mt-2 text-4xl font-semibold">Royalties & Payouts</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Accruals now land on payment confirmation, with payout batches tied back to treasury.
        </p>
      </section>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card title="Pending by Creator">
          <div className="space-y-2">
            {(overview?.pendingCreators ?? []).map((row) => (
              <div key={row.creatorId} className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{row.creator?.name ?? "Unknown creator"}</div>
                    <div className="text-xs text-[var(--cb-muted)]">{row.creator?.type ?? "unknown"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{money.format(row.amount)}</div>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        run(`payout-${row.creatorId}`, () =>
                          createPayout({
                            creatorId: row.creatorId as Id<"creators">,
                            periodStart: 0,
                            periodEnd: Date.now(),
                          }),
                        )
                      }
                      className="cb-link mt-1 text-xs text-[var(--cb-muted)]"
                    >
                      {busy === `payout-${row.creatorId}` ? "Creating..." : "Create payout"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {overview?.pendingCreators.length === 0 && <Empty>No unpaid positive ledger entries.</Empty>}
          </div>
        </Card>

        <Card title="Payout Runs">
          <div className="space-y-2">
            {(overview?.payouts ?? []).map((payout) => (
              <div key={payout._id} className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{payout.creator?.name ?? "Unknown creator"}</div>
                    <div className="text-xs text-[var(--cb-muted)]">
                      {new Date(payout.periodStart).toLocaleDateString()} to{" "}
                      {new Date(payout.periodEnd).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{money.format(payout.amount)}</div>
                    <span className="cb-badge">{payout.status}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["pending", "paid", "failed"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={busy !== null || payout.status === status}
                      onClick={() =>
                        run(`${payout._id}-${status}`, () =>
                          setPayoutStatus({
                            payoutId: payout._id,
                            status,
                            txHashOrRef: status === "paid" ? `manual-payout-${payout._id}` : undefined,
                          }),
                        )
                      }
                      className="cb-button-secondary min-h-8 px-3 py-1 text-xs"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {overview?.payouts.length === 0 && <Empty>No payout runs yet.</Empty>}
          </div>
        </Card>
      </section>

      <Card title="Recent Ledger Entries">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-[var(--cb-muted)]">
              <tr>
                <th className="py-2 pr-3">Creator</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Basis</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Payout</th>
              </tr>
            </thead>
            <tbody>
              {(overview?.recentEntries ?? []).map((entry) => (
                <tr key={entry._id} className="border-t border-[var(--cb-line)]">
                  <td className="py-2 pr-3">{entry.creator?.name ?? "Platform"}</td>
                  <td className="py-2 pr-3">{entry.role}</td>
                  <td className="py-2 pr-3">{money.format(entry.basisAmount)}</td>
                  <td className="py-2 pr-3">{money.format(entry.amount)}</td>
                  <td className="py-2 pr-3">{entry.payout?.status ?? "unpaid"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="cb-panel p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed border-[var(--cb-line)] p-3 text-sm text-[var(--cb-muted)]">{children}</div>;
}
