import { useNavigate } from "react-router-dom";

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  width?: string;
};

type Props<T extends { _id: string }> = {
  rows: T[] | undefined;
  columns: Column<T>[];
  rowHref?: (row: T) => string;
  empty?: string;
};

export function RecordTable<T extends { _id: string }>({
  rows,
  columns,
  rowHref,
  empty = "No records yet.",
}: Props<T>) {
  const nav = useNavigate();

  if (rows === undefined) {
    return (
      <div className="cb-panel border-dashed p-4 text-sm text-[var(--cb-muted)]">
        Loading…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="cb-panel border-dashed p-4 text-sm text-[var(--cb-muted)]">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--cb-line)] bg-[var(--cb-paper-soft)]">
      <table className="w-full text-sm">
        <thead className="border-b border-[var(--cb-line)] bg-[rgba(21,19,15,0.035)] text-left text-[11px] uppercase tracking-wide text-[var(--cb-muted)]">
          <tr>
            {columns.map((c) => (
              <th key={c.header} className={`px-4 py-3 ${c.width ?? ""}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r._id}
              className={`border-b border-[var(--cb-line)] last:border-0 ${rowHref ? "cursor-pointer hover:bg-[rgba(182,95,67,0.065)]" : ""}`}
              onClick={rowHref ? () => nav(rowHref(r)) : undefined}
            >
              {columns.map((c, i) => (
                <td key={i} className="px-4 py-3 align-top">
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
