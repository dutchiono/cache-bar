import { useMutation, useQuery } from "convex/react";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type Member = NonNullable<ReturnType<typeof useQuery<typeof api.team.list>>>[number];
type Role = Member["role"];
type ElizaAccess = Member["elizaAccess"];

const roles: Role[] = [
  "admin",
  "catalog_manager",
  "fulfillment",
  "finance",
  "support",
  "readonly",
];

const elizaAccessLevels: ElizaAccess[] = ["full", "scoped", "off"];

export default function Team() {
  const members = useQuery(api.team.list, {});
  const updateMember = useMutation(api.team.updateMember);
  const [drafts, setDrafts] = useState<Record<string, TeamPatch>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const list = members ?? [];
    return {
      admins: list.filter((member) => member.role === "admin").length,
      signers: list.filter((member) => member.isMultisigSigner).length,
      elizaFull: list.filter((member) => member.elizaAccess === "full").length,
    };
  }, [members]);

  function patchFor(member: Member): TeamPatch {
    return (
      drafts[member._id] ?? {
        role: member.role,
        elizaAccess: member.elizaAccess,
        isMultisigSigner: member.isMultisigSigner,
      }
    );
  }

  async function save(member: Member) {
    const patch = patchFor(member);
    setBusy(member._id);
    setError(null);
    try {
      await updateMember({
        userId: member._id as Id<"users">,
        role: patch.role,
        elizaAccess: patch.elizaAccess,
        isMultisigSigner: patch.isMultisigSigner,
      });
      setDrafts((current) => {
        const next = { ...current };
        delete next[member._id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update team member.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="cb-panel-dark p-5">
        <p className="cb-kicker text-[var(--cb-gold)]">Access control</p>
        <h1 className="cb-display mt-2 text-4xl font-semibold">Team & Roles</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Staff roles, Eliza access, and multisig signer flags. Bootstrap admins stay controlled by environment config.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Admins" value={counts.admins} />
        <Metric label="Multisig signers" value={counts.signers} />
        <Metric label="Full Eliza access" value={counts.elizaFull} />
      </section>

      <section className="cb-panel overflow-hidden">
        <div className="border-b border-[var(--cb-line)] px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Members</h2>
        </div>
        {error && (
          <div className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wide text-[var(--cb-muted)]">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Eliza</th>
                <th className="px-4 py-3">Signer</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((member) => {
                const patch = patchFor(member);
                const changed =
                  patch.role !== member.role ||
                  patch.elizaAccess !== member.elizaAccess ||
                  patch.isMultisigSigner !== member.isMultisigSigner;
                return (
                  <tr key={member._id} className="border-t border-[var(--cb-line)]">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{member.name ?? member.email ?? "Unnamed user"}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--cb-muted)]">
                        <span>{member.email ?? "no email"}</span>
                        {member.bootstrapAdmin && <span className="cb-badge rounded-md px-2 py-0.5 text-[10px]">Bootstrap</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={patch.role}
                        disabled={member.bootstrapAdmin}
                        options={roles}
                        onChange={(role) =>
                          setDraft(member._id, patch, setDrafts, {
                            role: role as Role,
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={patch.elizaAccess}
                        disabled={member.bootstrapAdmin}
                        options={elizaAccessLevels}
                        onChange={(elizaAccess) =>
                          setDraft(member._id, patch, setDrafts, {
                            elizaAccess: elizaAccess as ElizaAccess,
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={patch.isMultisigSigner}
                          disabled={member.bootstrapAdmin}
                          onChange={(event) =>
                            setDraft(member._id, patch, setDrafts, {
                              isMultisigSigner: event.target.checked,
                            })
                          }
                        />
                        Multisig signer
                      </label>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={!changed || member.bootstrapAdmin || busy !== null}
                        onClick={() => save(member)}
                        className="cb-button-secondary min-h-8 px-3 py-1 text-xs"
                      >
                        {busy === member._id ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {members?.length === 0 && (
            <div className="p-4 text-sm text-[var(--cb-muted)]">No staff accounts yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

type TeamPatch = {
  role: Role;
  elizaAccess: ElizaAccess;
  isMultisigSigner: boolean;
};

function setDraft(
  id: string,
  base: TeamPatch,
  setDrafts: Dispatch<SetStateAction<Record<string, TeamPatch>>>,
  patch: Partial<TeamPatch>,
) {
  setDrafts((current) => ({
    ...current,
    [id]: {
      ...base,
      ...patch,
    },
  }));
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="cb-panel p-4">
      <div className="cb-kicker">{label}</div>
      <div className="cb-display mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function Select({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="cb-field min-w-40 disabled:opacity-60"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option.replaceAll("_", " ")}
        </option>
      ))}
    </select>
  );
}
