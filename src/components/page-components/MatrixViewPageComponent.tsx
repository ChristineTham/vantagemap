import type { PageComponentProps } from "./types";
import { ComponentShell, EmptyState } from "./Shell";
import { configString, getString } from "./helpers";
import { scoreColor } from "@/components/chart-colors";

/**
 * Row × column heatmap of document counts. `config.rowField` and
 * `config.colField` select the two categorical axes. Cell intensity encodes
 * the count relative to the busiest cell.
 */
export function MatrixViewPageComponent({ config, documents }: PageComponentProps) {
  const rowField = configString(config, "rowField", "row");
  const colField = configString(config, "colField", "col");
  const title = configString(config, "title", "Matrix");

  const rows = Array.from(new Set(documents.map((d) => getString(d, rowField, "—") || "—")));
  const cols = Array.from(new Set(documents.map((d) => getString(d, colField, "—") || "—")));

  const counts = new Map<string, number>();
  for (const d of documents) {
    const key = `${getString(d, rowField, "—") || "—"}||${getString(d, colField, "—") || "—"}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const max = Math.max(1, ...counts.values());

  if (rows.length === 0 || cols.length === 0) {
    return (
      <ComponentShell title={title}>
        <EmptyState message="No data for matrix" />
      </ComponentShell>
    );
  }

  return (
    <ComponentShell title={title}>
      <figure
        role="img"
        aria-label={`Heatmap matrix of ${rowField} by ${colField}, ${rows.length} rows and ${cols.length} columns.`}
        className="overflow-x-auto"
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-medium text-rosely-mist" />
              {cols.map((c) => (
                <th key={c} className="p-2 text-center text-xs font-medium text-rosely-mist">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                <th
                  scope="row"
                  className="p-2 text-left text-xs font-medium text-rosely-night whitespace-nowrap"
                >
                  {r}
                </th>
                {cols.map((c) => {
                  const n = counts.get(`${r}||${c}`) ?? 0;
                  const intensity = (n / max) * 100;
                  return (
                    <td key={c} className="p-1 text-center">
                      <div
                        className="mx-auto flex h-9 w-full min-w-12 items-center justify-center rounded text-xs font-medium text-rosely-night"
                        style={{
                          backgroundColor: n === 0 ? "var(--rosely6)" : scoreColor(intensity),
                          opacity: n === 0 ? 0.4 : 0.35 + (intensity / 100) * 0.65,
                        }}
                      >
                        {n || ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </ComponentShell>
  );
}
