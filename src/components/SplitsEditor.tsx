import type { Id } from "../../convex/_generated/dataModel";

export type Split = {
  payeeCreatorId?: Id<"creators">;
  role: string;
  percent: number;
};

type Props = {
  value: Split[];
  onChange: (next: Split[]) => void;
  creators: { _id: Id<"creators">; name: string }[];
};

export function SplitsEditor({ value, onChange, creators }: Props) {
  const sumHundredths = value.reduce(
    (acc, s) => acc + Math.round(s.percent * 100),
    0,
  );
  const ok = sumHundredths === 10000;

  function set(i: number, patch: Partial<Split>) {
    onChange(value.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function add() {
    onChange([...value, { role: "", percent: 0 }]);
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
          Royalty splits
        </h4>
        <span
          className={`rounded px-2 py-0.5 text-xs font-mono ${ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {(sumHundredths / 100).toFixed(2)}% {ok ? "✓" : "must = 100"}
        </span>
      </div>
      {value.length === 0 && (
        <p className="mb-2 text-xs text-neutral-500">
          Add at least one split. Total must equal 100% exactly.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {value.map((s, i) => (
          <div
            key={i}
            className="grid grid-cols-[1.5fr_1fr_80px_30px] items-end gap-2"
          >
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-neutral-600">Payee</span>
              <select
                value={s.payeeCreatorId ?? ""}
                onChange={(e) =>
                  set(i, {
                    payeeCreatorId:
                      e.target.value === ""
                        ? undefined
                        : (e.target.value as Id<"creators">),
                  })
                }
                className="rounded border border-neutral-400 px-2 py-1"
              >
                <option value="">Platform</option>
                {creators.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-neutral-600">Role</span>
              <input
                value={s.role}
                onChange={(e) => set(i, { role: e.target.value })}
                className="rounded border border-neutral-400 px-2 py-1"
                placeholder="creator / platform / collab"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs">
              <span className="text-neutral-600">%</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={s.percent}
                onChange={(e) =>
                  set(i, { percent: Number(e.target.value) || 0 })
                }
                className="rounded border border-neutral-400 px-2 py-1 text-right"
              />
            </label>
            <button
              type="button"
              onClick={() => remove(i)}
              className="rounded border border-neutral-400 p-1 text-xs hover:bg-neutral-100"
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 rounded border border-dashed border-neutral-400 px-3 py-1 text-xs hover:bg-neutral-50"
      >
        + Add split
      </button>
    </div>
  );
}
