import { useMutation, useQuery } from "convex/react";
import { useMemo, useState, type FormEvent } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type Overview = NonNullable<ReturnType<typeof useQuery<typeof api.treasury.overview>>>;
type Account = Overview["accounts"][number];
type OffRampJob = Overview["offRampJobs"][number];

const money = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function Treasury() {
  const overview = useQuery(api.treasury.overview, {});
  const seedDemo = useMutation(api.treasury.seedDemo);
  const proposeOffRamp = useMutation(api.treasury.proposeOffRamp);
  const setOffRampStatus = useMutation(api.treasury.setOffRampStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const usdcAccounts = useMemo(
    () => overview?.accounts.filter((account) => account.kind === "usdc_multisig") ?? [],
    [overview],
  );

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Treasury action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onPropose(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const fromAccountId = form.get("fromAccountId") as Id<"treasuryAccounts">;
    await run("propose", async () => {
      await proposeOffRamp({
        fromAccountId,
        amountUsdc: Number(form.get("amountUsdc") ?? 0),
        expectedFiat: Number(form.get("expectedFiat") ?? 0),
        provider: String(form.get("provider") ?? ""),
      });
      e.currentTarget.reset();
    });
  }

  return (
    <div className="space-y-5">
      <section className="cb-panel-dark p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="cb-kicker text-[var(--cb-gold)]">Treasury operations</p>
            <h1 className="cb-display mt-2 text-4xl font-semibold">Treasury & Off-ramp</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Multisig balances, fiat ops, pending payouts, and off-ramp proposals in one place.
            </p>
          </div>
          <button
            onClick={() => run("seed", async () => seedDemo({}))}
            disabled={busy !== null}
            className="cb-button bg-[var(--cb-paper-soft)] text-[var(--cb-ink)] hover:bg-white"
          >
            {busy === "seed" ? "Seeding..." : "Seed sample treasury"}
          </button>
        </div>
        {error && <p className="mt-4 rounded-md border border-red-300/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="USDC multisig" value={`$${money.format(overview?.metrics.totalUsdc ?? 0)}`} />
        <Metric label="Fiat ops" value={`$${money.format(overview?.metrics.totalFiat ?? 0)}`} />
        <Metric label="Pending out" value={`$${money.format(overview?.metrics.pendingOut ?? 0)}`} />
        <Metric label="Proposals" value={String(overview?.metrics.proposedOffRamps ?? 0)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <div className="space-y-4">
          <Panel title="Accounts">
            <div className="grid gap-3 md:grid-cols-2">
              {(overview?.accounts ?? []).map((account) => (
                <AccountCard key={account._id} account={account} />
              ))}
              {overview?.accounts.length === 0 && <Empty>No treasury accounts yet.</Empty>}
            </div>
          </Panel>

          <Panel title="Transaction Ledger">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-[var(--cb-muted)]">
                  <tr>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.transactions ?? []).map((tx) => (
                    <tr key={tx._id} className="border-t border-[var(--cb-line)]">
                      <td className="py-2 pr-3 font-medium">{labelize(tx.type)}</td>
                      <td className="py-2 pr-3 font-mono">
                        {money.format(tx.amount)} {tx.currency}
                      </td>
                      <td className="py-2 pr-3">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="max-w-[260px] truncate py-2 pr-3 text-[var(--cb-muted)]">
                        {tx.txHash ?? tx.ref ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {overview?.transactions.length === 0 && <Empty>No transactions yet.</Empty>}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Propose Off-ramp">
            <form onSubmit={onPropose} className="space-y-3">
              <label className="block space-y-1">
                <span className="cb-label">Source multisig</span>
                <select name="fromAccountId" required className="cb-field">
                  <option value="">Select account...</option>
                  {usdcAccounts.map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.label} - ${money.format(account.balanceCache)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="USDC amount" name="amountUsdc" />
                <Field label="Expected fiat" name="expectedFiat" />
              </div>
              <Field label="Provider" name="provider" placeholder="Bridge / Mercury" />
              <button disabled={busy !== null} className="cb-button w-full" type="submit">
                {busy === "propose" ? "Proposing..." : "Create proposal"}
              </button>
            </form>
          </Panel>

          <Panel title="Off-ramp Jobs">
            <div className="space-y-2">
              {(overview?.offRampJobs ?? []).map((job) => (
                <OffRampCard
                  key={job._id}
                  job={job}
                  accounts={overview?.accounts ?? []}
                  disabled={busy !== null}
                  onStatus={(status) =>
                    run(`${job._id}-${status}`, () =>
                      setOffRampStatus({
                        id: job._id,
                        status,
                        fiatTxRef: status === "settled" ? `fiat:${job._id}` : undefined,
                      }),
                    )
                  }
                />
              ))}
              {overview?.offRampJobs.length === 0 && <Empty>No off-ramp jobs yet.</Empty>}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="cb-panel p-4">
      <div className="cb-kicker">{label}</div>
      <div className="cb-display mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="cb-panel p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

function AccountCard({ account }: { account: Account }) {
  return (
    <article className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{account.label}</h3>
          <p className="mt-1 text-xs text-[var(--cb-muted)]">
            {account.kind === "usdc_multisig" ? `${account.chain ?? "chain"} · ${account.multisigConfig ?? "multisig"}` : "Fiat operating account"}
          </p>
        </div>
        <span className="cb-badge">{account.kind === "usdc_multisig" ? "USDC" : "Fiat"}</span>
      </div>
      <div className="cb-display mt-4 text-3xl font-semibold">${money.format(account.balanceCache)}</div>
      {account.address && (
        <div className="mt-2 truncate rounded border border-[var(--cb-line)] bg-white/40 px-2 py-1 font-mono text-xs text-[var(--cb-muted)]">
          {account.address}
        </div>
      )}
    </article>
  );
}

function OffRampCard({
  job,
  accounts,
  disabled,
  onStatus,
}: {
  job: OffRampJob;
  accounts: Account[];
  disabled: boolean;
  onStatus: (status: "approved" | "settling" | "settled" | "failed") => void;
}) {
  const account = accounts.find((item) => item._id === job.fromAccountId);
  return (
    <article className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">
            {money.format(job.amountUsdc)} USDC → ${money.format(job.expectedFiat)}
          </div>
          <div className="mt-1 text-xs text-[var(--cb-muted)]">
            {job.provider} · {account?.label ?? "unknown account"}
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(["approved", "settling", "settled", "failed"] as const).map((status) => (
          <button
            key={status}
            type="button"
            disabled={disabled || job.status === status}
            onClick={() => onStatus(status)}
            className="cb-button-secondary min-h-8 px-2 py-1 text-xs"
          >
            {labelize(status)}
          </button>
        ))}
      </div>
    </article>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block space-y-1">
      <span className="cb-label">{label}</span>
      <input required type="number" step="0.01" min="0" {...rest} className="cb-field" />
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className="cb-badge">{labelize(status)}</span>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed border-[var(--cb-line)] p-3 text-sm text-[var(--cb-muted)]">{children}</div>;
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}
