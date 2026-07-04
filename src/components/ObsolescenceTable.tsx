"use client";

/**
 * Phase 13.4 — Obsolescence Risk Table
 *
 * Displays a sorted table of IT components and applications approaching
 * or past end-of-life/end-of-support dates with risk severity badges.
 */

interface ObsolescenceRiskItem {
  id: string;
  name: string;
  type: "Application" | "ITComponent";
  lifecycle: string | null;
  endOfLife: string | null;
  endOfSupport: string | null;
  daysUntilEol: number | null;
  daysUntilEos: number | null;
  riskLevel: "Critical" | "High" | "Medium" | "Low";
  owner: string | null;
}

const RISK_BADGE_STYLES: Record<string, string> = {
  Critical: "bg-rosely-rose/10 text-rosely-rose border-rosely-rose/30",
  High: "bg-rosely-flamingo/10 text-rosely-flamingo border-rosely-flamingo/30",
  Medium: "bg-rosely-golden/10 text-rosely-golden border-rosely-golden/30",
  Low: "bg-rosely-teal/10 text-rosely-teal border-rosely-teal/30",
};

export function ObsolescenceTable({ items }: { items: ObsolescenceRiskItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-rosely-blush bg-card p-5">
        <h3 className="text-sm font-semibold text-rosely-night mb-3">Obsolescence Risk Details</h3>
        <p className="text-center text-sm text-rosely-mist py-8">
          No items with end-of-life or end-of-support dates tracked.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rosely-blush bg-card p-5">
      <h3 className="text-sm font-semibold text-rosely-night mb-1">Obsolescence Risk Details</h3>
      <p className="text-xs text-rosely-mist mb-4">
        {items.length} items tracked — sorted by risk severity
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rosely-blush text-left">
              <th className="pb-2 font-medium text-rosely-dusk">Name</th>
              <th className="pb-2 font-medium text-rosely-dusk">Type</th>
              <th className="pb-2 font-medium text-rosely-dusk">Risk</th>
              <th className="pb-2 font-medium text-rosely-dusk">End of Life</th>
              <th className="pb-2 font-medium text-rosely-dusk">Days Left</th>
              <th className="pb-2 font-medium text-rosely-dusk">Owner</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 25).map((item) => (
              <tr key={item.id} className="border-b border-rosely-blush/50">
                <td className="py-2 text-rosely-night font-medium">{item.name}</td>
                <td className="py-2 text-rosely-dusk text-xs">
                  {item.type === "ITComponent" ? "IT Component" : "Application"}
                </td>
                <td className="py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${RISK_BADGE_STYLES[item.riskLevel]}`}
                  >
                    {item.riskLevel}
                  </span>
                </td>
                <td className="py-2 text-rosely-dusk text-xs">
                  {item.endOfLife ?? item.lifecycle ?? "—"}
                </td>
                <td className="py-2 text-xs">
                  {item.daysUntilEol !== null ? (
                    <span
                      className={
                        item.daysUntilEol <= 0 ? "text-rosely-rose font-medium" : "text-rosely-dusk"
                      }
                    >
                      {item.daysUntilEol <= 0
                        ? `${Math.abs(item.daysUntilEol)}d overdue`
                        : `${item.daysUntilEol}d`}
                    </span>
                  ) : (
                    <span className="text-rosely-mist">—</span>
                  )}
                </td>
                <td className="py-2 text-rosely-mist text-xs">{item.owner ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length > 25 && (
          <p className="text-xs text-rosely-mist mt-2 text-center">
            Showing 25 of {items.length} items
          </p>
        )}
      </div>
    </div>
  );
}
