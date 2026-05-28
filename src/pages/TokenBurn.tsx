import { useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../convex/_generated/api";

export default function TokenBurn() {
  const programs = useQuery(api.token.programs, {});
  const redemptions = useQuery(api.stash.redemptions, {});
  const burns = useQuery(api.token.burns, {});
  const upsertProgram = useMutation(api.token.upsertProgram);
  const seedDemo = useMutation(api.token.seedDemo);
  const setBurnStatus = useMutation(api.token.setBurnStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : ".stash action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await run("create", async () => {
      await upsertProgram({
        projectName: String(form.get("projectName") ?? ""),
        tokenSymbol: String(form.get("tokenSymbol") ?? ""),
        chain: form.get("chain") as "evm" | "solana",
        tokenKind: form.get("tokenKind") as "native" | "erc20" | "spl",
        tokenAddress: String(form.get("tokenAddress") ?? "") || undefined,
        tokenDecimals: Number(form.get("tokenDecimals") ?? 18),
        burnTarget: String(form.get("burnTarget") ?? ""),
        burnMechanism: form.get("burnMechanism") as
          | "transfer_to_burn"
          | "contract_burn"
          | "manual_verify",
        discountPerTokenUsd: Number(form.get("discountPerTokenUsd") ?? 0),
        maxDiscountUsd: Number(form.get("maxDiscountUsd") ?? 0),
        active: form.get("active") === "on",
        redemptionEnabled: form.get("redemptionEnabled") === "on",
        minimumRedemptionTokens: Number(form.get("minimumRedemptionTokens") ?? 0),
        promotionCodePrefix: String(form.get("promotionCodePrefix") ?? "") || undefined,
        promotionCodeExpiresInDays:
          Number(form.get("promotionCodeExpiresInDays") ?? 0) || undefined,
        preDropNft:
          form.get("preDropEnabled") === "on"
            ? {
                enabled: true,
                collectionName: String(form.get("collectionName") ?? ""),
                contractOrMint: String(form.get("contractOrMint") ?? "") || undefined,
                mintPriceUsdc: Number(form.get("mintPriceUsdc") ?? 0),
                discountPercent: Number(form.get("discountPercent") ?? 0),
              }
            : undefined,
        notes: String(form.get("notes") ?? "") || undefined,
      });
      e.currentTarget.reset();
    });
  }

  return (
    <div className="space-y-5">
      <section className="cb-panel-dark p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="cb-kicker text-[var(--cb-gold)]">Token-linked discounts</p>
            <h1 className="cb-display mt-2 text-4xl font-semibold">.stash</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Configure burn targets, discount ratios, and one-time Stripe code rules for products tied to a token program.
            </p>
          </div>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("seed", () => seedDemo({}))}
            className="cb-button bg-[var(--cb-paper-soft)] text-[var(--cb-ink)] hover:bg-white"
          >
            Seed Demo Program
          </button>
        </div>
      </section>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={onCreate} className="cb-panel p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide">New .stash Program</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Project" name="projectName" placeholder="Project name" />
            <Field label="Symbol" name="tokenSymbol" placeholder="TOKEN" />
            <Select label="Chain" name="chain" options={["evm", "solana"]} />
            <Select label="Token kind" name="tokenKind" options={["native", "erc20", "spl"]} />
            <Field label="Token address" name="tokenAddress" required={false} />
            <Field label="Token decimals" name="tokenDecimals" type="number" defaultValue="18" />
            <Field label="Burn target" name="burnTarget" placeholder="burn address / program" />
            <Select
              label="Burn mechanism"
              name="burnMechanism"
              options={["transfer_to_burn", "contract_burn", "manual_verify"]}
            />
            <Field label="$ discount / token" name="discountPerTokenUsd" type="number" step="0.000001" />
            <Field label="Max discount $" name="maxDiscountUsd" type="number" step="0.01" />
            <Field label="Minimum burn" name="minimumRedemptionTokens" type="number" step="0.000001" defaultValue="0" />
            <Field label="Code prefix" name="promotionCodePrefix" placeholder="DROP" required={false} />
            <Field label="Code expiry days" name="promotionCodeExpiresInDays" type="number" defaultValue="14" required={false} />
            <label className="mt-6 inline-flex items-center gap-2 text-sm">
              <input name="active" type="checkbox" defaultChecked />
              Active
            </label>
            <label className="mt-6 inline-flex items-center gap-2 text-sm">
              <input name="redemptionEnabled" type="checkbox" defaultChecked />
              Enable .stash redemption
            </label>
          </div>

          <div className="mt-5 rounded-md border border-[var(--cb-line)] bg-white/35 p-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input name="preDropEnabled" type="checkbox" />
              Pre-drop NFT offer
            </label>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Collection" name="collectionName" required={false} />
              <Field label="Contract / mint" name="contractOrMint" required={false} />
              <Field label="Mint price USDC" name="mintPriceUsdc" type="number" required={false} />
              <Field label="NFT discount %" name="discountPercent" type="number" required={false} />
            </div>
          </div>

          <label className="mt-3 block space-y-1">
            <span className="cb-label">Notes</span>
            <textarea name="notes" className="cb-field min-h-20" />
          </label>

          <button type="submit" disabled={busy !== null} className="cb-button mt-4 w-full">
            {busy === "create" ? "Creating..." : "Create program"}
          </button>
        </form>

        <div className="space-y-4">
          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Programs</h2>
            <div className="space-y-2">
              {(programs ?? []).map((program) => (
                <article key={program._id} className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{program.projectName}</div>
                      <div className="text-sm text-[var(--cb-muted)]">
                        {program.tokenSymbol} · {program.chain} · {program.tokenKind}
                      </div>
                    </div>
                    <span className="cb-badge">{program.active ? "active" : "paused"}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                    <Line label="Burn target" value={program.burnTarget} mono />
                    <Line label="Discount" value={`$${program.discountPerTokenUsd}/token`} />
                    <Line label="Max" value={`$${program.maxDiscountUsd}`} />
                    <Line label="Min burn" value={program.minimumRedemptionTokens} />
                    <Line label="Code prefix" value={program.promotionCodePrefix ?? "STASH"} />
                    <Line label="Self-serve" value={program.redemptionEnabled ? "on" : "off"} />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Issued .stash Codes</h2>
            <div className="space-y-2">
              {(redemptions ?? []).map((row) => (
                <article key={row._id} className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{row.program?.projectName ?? "Unknown program"}</div>
                      <div className="text-sm text-[var(--cb-muted)]">
                        {row.customerEmail} · {row.amountTokens} tokens · ${row.discountValueUsd.toFixed(2)} off
                      </div>
                    </div>
                    <span className="cb-badge">{row.status}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
                    <Line label="Code" value={row.promotionCode ?? "—"} mono />
                    <Line label="Wallet" value={row.walletAddress ?? "—"} mono />
                    <Line label="Burn tx" value={row.burnTxHash ?? "—"} mono />
                    <Line
                      label="Expires"
                      value={row.expiresAt ? new Date(row.expiresAt).toLocaleString() : "—"}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="cb-panel p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide">Legacy burn records</h2>
            <div className="space-y-2">
              {(burns ?? []).map((burn) => (
                <article key={burn._id} className="rounded-md border border-[var(--cb-line)] bg-white/40 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {burn.amountTokens} {burn.program?.tokenSymbol ?? "tokens"} burned
                      </div>
                      <div className="text-sm text-[var(--cb-muted)]">
                        {burn.customer?.email ?? "unknown"} · discount ${burn.discountValue.toFixed(2)}
                      </div>
                    </div>
                    <span className="cb-badge">{burn.status ?? "pending"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      disabled={busy !== null || burn.status === "verified"}
                      onClick={() =>
                        run(`verify-${burn._id}`, () =>
                          setBurnStatus({
                            burnId: burn._id,
                            status: "verified",
                            burnTxHash: burn.burnTxHash ?? `manual-${burn._id}`,
                          }),
                        )
                      }
                      className="cb-button min-h-8 px-3 py-1 text-xs"
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null || burn.status === "failed"}
                      onClick={() =>
                        run(`fail-${burn._id}`, () =>
                          setBurnStatus({ burnId: burn._id, status: "failed" }),
                        )
                      }
                      className="cb-button-secondary min-h-8 px-3 py-1 text-xs"
                    >
                      Fail
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block space-y-1">
      <span className="cb-label">{label}</span>
      <input {...rest} required={rest.required ?? true} className="cb-field" />
    </label>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label className="block space-y-1">
      <span className="cb-label">{label}</span>
      <select name={name} className="cb-field">
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function Line({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[var(--cb-muted)]">{label}</div>
      <div className={`truncate ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
