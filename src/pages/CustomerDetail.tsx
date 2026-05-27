import { useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const customerId = id as Id<"customers">;
  const detail = useQuery(api.customers.get, { id: customerId });
  const attachWallet = useMutation(api.customers.attachWallet);
  const addActivity = useMutation(api.customers.addActivity);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onWalletSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("wallet");
    setError(null);
    try {
      await attachWallet({
        customerId,
        chain: form.get("chain") as "evm" | "solana",
        address: String(form.get("address") ?? ""),
        verified: form.get("verified") === "on",
      });
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to attach wallet.");
    } finally {
      setBusy(null);
    }
  }

  async function onActivitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("activity");
    setError(null);
    try {
      await addActivity({
        customerId,
        type: form.get("type") as "note" | "email" | "token_tier_change" | "ai_action",
        body: String(form.get("body") ?? ""),
      });
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add activity.");
    } finally {
      setBusy(null);
    }
  }

  if (detail === undefined) return <p className="text-sm text-neutral-500">Loading...</p>;
  if (!detail) return <p className="text-sm text-neutral-500">Customer not found.</p>;

  return (
    <div className="space-y-5">
      <div className="text-xs text-neutral-500">
        <Link to="/app/customers" className="cb-link">
          Customers
        </Link>{" "}
        / {detail.customer.name}
      </div>

      <section className="cb-panel-dark p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="cb-kicker text-[var(--cb-gold)]">Customer record</p>
            <h1 className="cb-display mt-2 text-4xl font-semibold">{detail.customer.name}</h1>
            <p className="mt-2 text-sm text-zinc-400">{detail.customer.email ?? "No email on file"}</p>
          </div>
          <div className="grid gap-2 text-right text-sm text-zinc-300">
            <div>LTV: {money.format(detail.customer.lifetimeValue)}</div>
            <div>Orders: {detail.customer.orderCount}</div>
            <div>Burned: {detail.customer.tokensBurnedLifetime} tokens</div>
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <Card title="Wallets">
            <div className="space-y-2">
              {detail.wallets.map((wallet) => (
                <div key={wallet._id} className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{wallet.chain}</div>
                    <span className="cb-badge">{wallet.verifiedAt ? "verified" : "unverified"}</span>
                  </div>
                  <div className="mt-2 truncate font-mono text-xs text-[var(--cb-muted)]">{wallet.address}</div>
                </div>
              ))}
              {detail.wallets.length === 0 && <Empty>No wallets attached yet.</Empty>}
            </div>
            <form onSubmit={onWalletSubmit} className="mt-3 grid gap-3 md:grid-cols-[120px_1fr_auto]">
              <select name="chain" className="cb-field">
                <option value="evm">evm</option>
                <option value="solana">solana</option>
              </select>
              <input name="address" placeholder="Wallet address" className="cb-field" required />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="verified" />
                Verified
              </label>
              <button type="submit" disabled={busy !== null} className="cb-button md:col-span-3">
                {busy === "wallet" ? "Saving..." : "Attach wallet"}
              </button>
            </form>
          </Card>

          <Card title="Activity">
            <div className="space-y-2">
              {detail.activities.map((activity) => (
                <div key={activity._id} className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="cb-badge">{activity.type.replaceAll("_", " ")}</span>
                    <span className="text-xs text-[var(--cb-muted)]">
                      {new Date(activity._creationTime).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-2 text-sm">{activity.body}</div>
                </div>
              ))}
              {detail.activities.length === 0 && <Empty>No activity yet.</Empty>}
            </div>
            <form onSubmit={onActivitySubmit} className="mt-3 space-y-3">
              <select name="type" className="cb-field">
                <option value="note">note</option>
                <option value="email">email</option>
                <option value="token_tier_change">token tier change</option>
                <option value="ai_action">ai action</option>
              </select>
              <textarea name="body" className="cb-field min-h-24" placeholder="Add support note or CRM activity" required />
              <button type="submit" disabled={busy !== null} className="cb-button w-full">
                {busy === "activity" ? "Saving..." : "Add activity"}
              </button>
            </form>
          </Card>
        </div>

        <Card title="Orders">
          <div className="space-y-2">
            {detail.orders.map((order) => (
              <Link
                key={order._id}
                to={`/app/orders/${order._id}`}
                className="block rounded-md border border-[var(--cb-line)] bg-white/40 p-3 transition hover:bg-white/70"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{order.number}</div>
                    <div className="text-xs text-[var(--cb-muted)]">
                      {new Date(order.placedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{money.format(order.total)}</div>
                    <div className="text-xs text-[var(--cb-muted)]">{order.status}</div>
                  </div>
                </div>
              </Link>
            ))}
            {detail.orders.length === 0 && <Empty>No orders yet.</Empty>}
          </div>
        </Card>
      </section>
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
