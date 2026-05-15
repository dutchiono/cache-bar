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
      <div className="rounded border-2 border-dashed border-neutral-300 p-4 text-sm text-neutral-500">
        Loading…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="rounded border-2 border-dashed border-neutral-300 p-4 text-sm text-neutral-500">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border-2 border-black bg-white">
      <table className="w-full text-sm">
        <thead className="border-b-2 border-black bg-neutral-50 text-left text-[11px] uppercase tracking-wide text-neutral-500">
          <tr>
            {columns.map((c) => (
              <th key={c.header} className={`px-3 py-2 ${c.width ?? ""}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r._id}
              className={`border-b border-neutral-200 ${rowHref ? "cursor-pointer hover:bg-neutral-50" : ""}`}
              onClick={rowHref ? () => nav(rowHref(r)) : undefined}
            >
              {columns.map((c, i) => (
                <td key={i} className="px-3 py-2 align-top">
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
