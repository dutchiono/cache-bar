import { useMutation, useQuery } from "convex/react";
import { useState, type FormEvent } from "react";
import { api } from "../../convex/_generated/api";
import { RecordTable, type Column } from "../components/RecordTable";

type Creator = NonNullable<ReturnType<typeof useQuery<typeof api.creators.list>>>[number];

export default function Creators() {
  const creators = useQuery(api.creators.list, {});
  const me = useQuery(api.users.getCurrentUser);
  const createHuman = useMutation(api.creators.createHumanCreator);
  const registerAgent = useMutation(api.creators.registerAgentCreator);

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"human" | "agent">("human");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    try {
      const payoutKind = fd.get("payoutKind") as "bank" | "usdc_wallet";
      const payoutMethod = {
        kind: payoutKind,
        chain:
          payoutKind === "usdc_wallet"
            ? ((fd.get("payoutChain") as "evm" | "solana") ?? "evm")
            : undefined,
        address:
          payoutKind === "usdc_wallet"
            ? ((fd.get("payoutAddress") as string) || "")
            : undefined,
        bankRef:
          payoutKind === "bank"
            ? ((fd.get("payoutBankRef") as string) || "")
            : undefined,
      };

      if (type === "human") {
        await createHuman({
          name: fd.get("name") as string,
          payoutMethod,
        });
      } else {
        if (!me?._id) throw new Error("Signed-in user not loaded yet.");
        await registerAgent({
          name: fd.get("name") as string,
          agentId: fd.get("agentId") as string,
          baseModel: fd.get("baseModel") as string,
          operatorUserId: me._id,
          reinvestPercent: Number(fd.get("reinvestPercent") ?? 0),
          capabilities: ((fd.get("capabilities") as string) || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          payoutMethod,
        });
      }
      (e.currentTarget as HTMLFormElement).reset();
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed.");
    } finally {
      setPending(false);
    }
  }

  const columns: Column<Creator>[] = [
    {
      header: "Name",
      cell: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      header: "Type",
      cell: (r) => (
        <span
          className={`cb-badge ${r.type === "agent" ? "cb-badge-agent" : "cb-badge-human"}`}
        >
          {r.type}
        </span>
      ),
      width: "w-24",
    },
    { header: "Status", cell: (r) => r.status, width: "w-24" },
    {
      header: "Payout",
      cell: (r) =>
        r.payoutMethod.kind === "usdc_wallet"
          ? `USDC · ${r.payoutMethod.chain} · ${r.payoutMethod.address?.slice(0, 8)}…`
          : `Bank · ${r.payoutMethod.bankRef}`,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="cb-display text-3xl font-semibold">Creators</h1>
          <p className="text-sm text-[var(--cb-muted)]">Human and agent creators</p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="cb-button"
        >
          {open ? "Cancel" : "+ New creator"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={onSubmit}
          className="cb-panel p-4"
        >
          <div className="mb-3 flex gap-2">
            {(["human", "agent"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={type === t ? "cb-button min-h-8 py-1" : "cb-button-secondary min-h-8 py-1"}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" name="name" required />
            {type === "agent" && (
              <>
                <Field label="Agent ID" name="agentId" required />
                <Field label="Base model" name="baseModel" required />
                <Field
                  label="Reinvest %"
                  name="reinvestPercent"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue="0"
                  required
                />
                <Field label="Capabilities (csv)" name="capabilities" />
              </>
            )}
          </div>

          <div className="mt-4">
            <div className="cb-kicker mb-2">
              Payout method
            </div>
            <PayoutMethodFields agentLocked={type === "agent"} />
          </div>

          {err && (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="submit"
              disabled={pending}
              className="cb-button"
            >
              {pending ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      )}

      <RecordTable<Creator>
        rows={creators}
        columns={columns}
        rowHref={(r) => `/creators/${r._id}`}
        empty="No creators yet. Click '+ New creator' above."
      />
    </div>
  );
}

function Field(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
  const { label, ...rest } = props;
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="cb-label">{label}</span>
      <input {...rest} className="cb-field" />
    </label>
  );
}

function PayoutMethodFields({ agentLocked }: { agentLocked: boolean }) {
  const [kind, setKind] = useState<"bank" | "usdc_wallet">(
    agentLocked ? "usdc_wallet" : "bank",
  );
  return (
    <>
      <input type="hidden" name="payoutKind" value={kind} />
      <div className="mb-2 flex gap-2">
        {(["bank", "usdc_wallet"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => !agentLocked && setKind(k)}
            disabled={agentLocked && k !== "usdc_wallet"}
            className={`${kind === k ? "cb-button min-h-8 py-1 text-xs" : "cb-button-secondary min-h-8 py-1 text-xs"} ${agentLocked && k !== "usdc_wallet" ? "opacity-30" : ""}`}
          >
            {k}
          </button>
        ))}
      </div>
      {kind === "usdc_wallet" ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="cb-label">Chain</span>
            <select
              name="payoutChain"
              defaultValue="evm"
              className="cb-field"
            >
              <option value="evm">Base / EVM</option>
              <option value="solana">Solana</option>
            </select>
          </label>
          <Field label="Address" name="payoutAddress" required />
        </div>
      ) : (
        <Field label="Bank reference" name="payoutBankRef" required />
      )}
    </>
  );
}
