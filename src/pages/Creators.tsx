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
          className={`rounded-full border px-2 py-0.5 text-[11px] ${r.type === "agent" ? "border-purple-300 bg-purple-50" : "border-green-300 bg-green-50"}`}
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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Creators</h1>
          <p className="text-sm text-neutral-500">Human and agent creators</p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded border-2 border-black bg-black px-3 py-1.5 text-sm font-semibold text-white"
        >
          {open ? "Cancel" : "+ New creator"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={onSubmit}
          className="mb-6 rounded-lg border-2 border-black bg-white p-4"
        >
          <div className="mb-3 flex gap-2">
            {(["human", "agent"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded border-2 px-3 py-1 text-sm ${type === t ? "border-black bg-black text-white" : "border-neutral-300"}`}
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
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Payout method
            </div>
            <PayoutMethodFields agentLocked={type === "agent"} />
          </div>

          {err && (
            <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded border-2 border-black bg-black px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
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
      <span className="text-xs text-neutral-600">{label}</span>
      <input {...rest} className="rounded border border-neutral-400 px-2 py-1" />
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
            className={`rounded border-2 px-3 py-1 text-xs ${kind === k ? "border-black bg-black text-white" : "border-neutral-300"} ${agentLocked && k !== "usdc_wallet" ? "opacity-30" : ""}`}
          >
            {k}
          </button>
        ))}
      </div>
      {kind === "usdc_wallet" ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-neutral-600">Chain</span>
            <select
              name="payoutChain"
              defaultValue="evm"
              className="rounded border border-neutral-400 px-2 py-1"
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
