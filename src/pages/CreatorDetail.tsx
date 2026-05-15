import { useMutation, useQuery } from "convex/react";
import { useParams, Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export default function CreatorDetail() {
  const { id } = useParams<{ id: string }>();
  const creatorId = id as Id<"creators">;
  const creator = useQuery(api.creators.get, { id: creatorId });
  const setStatus = useMutation(api.creators.setStatus);

  if (creator === undefined) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (!creator) return <p className="text-sm text-neutral-500">Creator not found.</p>;

  return (
    <div>
      <div className="mb-1 text-xs text-neutral-500">
        <Link to="/creators" className="underline">
          Creators
        </Link>{" "}
        / {creator.name}
      </div>
      <h1 className="mb-1 text-2xl font-bold">{creator.name}</h1>
      <div className="mb-6 flex items-center gap-2">
        <Pill kind={creator.type === "agent" ? "purple" : "green"}>{creator.type}</Pill>
        <Pill kind="grey">{creator.status}</Pill>
        <button
          onClick={() =>
            setStatus({
              id: creator._id,
              status: creator.status === "active" ? "paused" : "active",
            })
          }
          className="text-xs text-neutral-500 underline hover:text-neutral-700"
        >
          Toggle status
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Payout method">
          {creator.payoutMethod.kind === "usdc_wallet" ? (
            <>
              <Row k="Kind" v="USDC wallet" />
              <Row k="Chain" v={creator.payoutMethod.chain ?? "—"} />
              <Row k="Address" v={creator.payoutMethod.address ?? "—"} mono />
            </>
          ) : (
            <>
              <Row k="Kind" v="Bank" />
              <Row k="Reference" v={creator.payoutMethod.bankRef ?? "—"} />
            </>
          )}
        </Card>

        {creator.type === "agent" && (
          <Card title="Agent identity">
            <Row k="Agent ID" v={creator.agentId ?? "—"} mono />
            <Row k="Base model" v={creator.baseModel ?? "—"} />
            <Row k="Operator" v={creator.operatorUserId ?? "—"} mono />
            <Row k="Reinvest" v={`${creator.reinvestPercent ?? 0}%`} />
            <Row
              k="Capabilities"
              v={(creator.capabilities ?? []).join(", ") || "—"}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-black bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="mb-2">
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{k}</div>
      <div className={`border-b border-dashed border-neutral-300 py-1 ${mono ? "font-mono text-xs" : ""}`}>
        {v}
      </div>
    </div>
  );
}

function Pill({ kind, children }: { kind: "purple" | "green" | "grey"; children: React.ReactNode }) {
  const colors = {
    purple: "border-purple-300 bg-purple-50",
    green: "border-green-300 bg-green-50",
    grey: "border-neutral-300 bg-neutral-100",
  } as const;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${colors[kind]}`}>
      {children}
    </span>
  );
}
